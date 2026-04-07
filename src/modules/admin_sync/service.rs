//! Logique métier des routes admin sync (hors wiring HTTP Actix).

use std::path::Path;

use sqlx::PgPool;

use crate::card_metadata_fill::{self, ARCHETYPE_SOURCE_YGORG_EFFECT_EN};
use crate::cards_sync;
use crate::db;
use crate::shared::search::cache::CardCache;

pub fn csv_field(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\r') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

pub async fn fetch_cards_with_pool(
    pool: &PgPool,
    card_cache: &CardCache,
) -> Result<String, String> {
    match cards_sync::sync_from_ygoprodeck(pool).await {
        Ok(stats) => {
            let cards = db::load_all_cards(pool)
                .await
                .map_err(|e| format!("Rechargement cache: {e}"))?;
            card_cache.replace_with(cards);
            Ok(format!(
                "Cartes mises à jour en base et cache rechargé. (cartes: {}, lignes sets: {}, upserts sets: {})",
                stats.card_rows, stats.set_rows, stats.sets_affected
            ))
        }
        Err(e) => Err(format!("Sync YGOProDeck: {e}")),
    }
}

pub async fn fetch_cards_file_fallback(
    cards_path: &str,
    card_cache: &CardCache,
) -> Result<String, String> {
    let response = reqwest::get(cards_sync::DEFAULT_YGOPRODECK_CARDINFO_URL)
        .await
        .map_err(|e| format!("Erreur API: {e}"))?;
    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Erreur JSON: {e}"))?;

    let path = Path::new(cards_path);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(path, json.to_string()).map_err(|e| format!("Erreur écriture: {e}"))?;
    card_cache
        .reload(path)
        .map_err(|e| format!("Erreur cache: {e}"))?;
    Ok("Cartes sauvegardées dans cards.json".to_string())
}

pub async fn reload_cache_from_db(pool: &PgPool, card_cache: &CardCache) -> Result<String, String> {
    let cards = db::load_all_cards(pool)
        .await
        .map_err(|e| format!("Erreur lecture base: {e}"))?;
    let n = cards.len();
    card_cache.replace_with(cards);
    Ok(format!("Cache rechargé depuis la base ({n} cartes)."))
}

pub async fn preview_card_metadata_fill_body(
    pool: &PgPool,
    max_rows: i64,
) -> Result<String, String> {
    let total = db::count_archetype_fill_candidates(pool)
        .await
        .map_err(|e| format!("DB: {e}"))?;
    let rows = db::list_archetype_fill_candidates(pool, max_rows)
        .await
        .map_err(|e| format!("DB: {e}"))?;

    let mut out = String::new();
    out.push_str("# Phase 1 — prévisualisation complément métadonnées (aucune écriture)\n");
    out.push_str(
        "# Critère: archetype NULL/vide ET card_enrichment_layers (ygorganization, card_raw)\n",
    );
    out.push_str(&format!("total_candidates={total}\n"));
    out.push_str(&format!("csv_rows_returned={}\n", rows.len()));
    out.push_str(&format!("max_requested={max_rows}\n"));
    out.push('\n');
    out.push_str("id,name,name_en\n");
    for r in rows {
        let name_en = r.name_en.as_deref().unwrap_or("");
        out.push_str(&format!(
            "{},{},{}\n",
            r.id,
            csv_field(&r.name),
            csv_field(name_en)
        ));
    }
    Ok(out)
}

pub async fn apply_card_metadata_fill_body(
    pool: &PgPool,
    card_cache: &CardCache,
    max_rows: i64,
    do_write: bool,
) -> Result<String, String> {
    let rows = db::list_archetype_fill_candidates_with_payload(pool, max_rows)
        .await
        .map_err(|e| format!("DB: {e}"))?;

    let mut derivable = 0u32;
    let mut no_derivation = 0u32;
    let mut updated = 0u32;
    let mut report_lines: Vec<String> = Vec::new();

    for r in &rows {
        let derived = card_metadata_fill::derive_archetype_from_ygorg_payload(&r.payload.0);
        match &derived {
            Some(a) => {
                derivable += 1;
                if do_write {
                    match db::update_card_archetype_null_only(
                        pool,
                        r.id,
                        a.as_str(),
                        ARCHETYPE_SOURCE_YGORG_EFFECT_EN,
                    )
                    .await
                    {
                        Ok(true) => {
                            updated += 1;
                            report_lines.push(format!(
                                "updated id={} name={} archetype={}",
                                r.id, r.name, a
                            ));
                        }
                        Ok(false) => report_lines.push(format!(
                            "skip id={} (archetype déjà renseigné en concurrence ?)",
                            r.id
                        )),
                        Err(e) => return Err(format!("DB update id={}: {e}", r.id)),
                    }
                } else {
                    report_lines.push(format!(
                        "would_update id={} name={} archetype={}",
                        r.id, r.name, a
                    ));
                }
            }
            None => {
                no_derivation += 1;
                if report_lines.len() < 80 {
                    report_lines.push(format!("no_derivation id={} name={}", r.id, r.name));
                }
            }
        }
    }

    if do_write {
        let cards = db::load_all_cards(pool)
            .await
            .map_err(|e| format!("Rechargement cache après écriture: {e}"))?;
        card_cache.replace_with(cards);
    }

    let mut out = String::new();
    out.push_str("# Phase 2–3 — complément archetype depuis YGOrg card_raw\n");
    out.push_str("# Heuristique: archetype explicite ; monstre: \\\"...\\\" monster ; Spell/Trap: add 1 \\\"...\\\" card (1re ligne)\n");
    out.push_str(&format!("write={}\n", if do_write { "1" } else { "0" }));
    out.push_str(&format!("candidates_scanned={}\n", rows.len()));
    out.push_str(&format!("derivable={derivable}\n"));
    out.push_str(&format!("no_derivation={no_derivation}\n"));
    if do_write {
        out.push_str(&format!("rows_updated={updated}\n"));
    } else {
        out.push_str(&format!("would_update_count={derivable}\n"));
    }
    out.push('\n');
    let detail_truncated = report_lines.len() >= 80;
    for line in report_lines {
        out.push_str(&line);
        out.push('\n');
    }
    if detail_truncated {
        out.push_str("# … détail tronqué (plafond 80 lignes)\n");
    }
    Ok(out)
}
