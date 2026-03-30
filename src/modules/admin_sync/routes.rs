//! Sync cartes / cache / enrichissement YGOrg (routes admin protégées).

use std::path::Path;

use actix_web::{HttpResponse, get, http::StatusCode, web};
use serde::Deserialize;

use crate::card_metadata_fill::{self, ARCHETYPE_SOURCE_YGORG_EFFECT_EN};
use crate::cards_sync;
use crate::db;
use crate::shared::search::cache::CardCache;

#[get("/fetch_cards")]
pub async fn fetch_cards(
    card_cache: web::Data<CardCache>,
    cards_path: web::Data<String>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    if let Some(pool) = pool {
        match cards_sync::sync_from_ygoprodeck(pool.get_ref()).await {
            Ok(stats) => {
                let cards = match db::load_all_cards(pool.get_ref()).await {
                    Ok(c) => c,
                    Err(e) => {
                        eprintln!("fetch_cards: load_all_cards: {e}");
                        return HttpResponse::InternalServerError()
                            .body(format!("Rechargement cache: {e}"));
                    }
                };
                card_cache.replace_with(cards);
                return HttpResponse::Ok().body(format!(
                    "Cartes mises à jour en base et cache rechargé. (cartes: {}, lignes sets: {}, upserts sets: {})",
                    stats.card_rows, stats.set_rows, stats.sets_affected
                ));
            }
            Err(e) => {
                eprintln!("fetch_cards: sync YGOProDeck: {e}");
                return HttpResponse::InternalServerError().body(format!("Sync YGOProDeck: {e}"));
            }
        }
    }

    let response = match reqwest::get(cards_sync::DEFAULT_YGOPRODECK_CARDINFO_URL).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("fetch_cards: erreur requête API: {e}");
            return HttpResponse::InternalServerError().body(format!("Erreur API: {e}"));
        }
    };
    let json: serde_json::Value = match response.json().await {
        Ok(j) => j,
        Err(e) => {
            eprintln!("fetch_cards: erreur JSON: {e}");
            return HttpResponse::InternalServerError().body(format!("Erreur JSON: {e}"));
        }
    };

    let path = Path::new(cards_path.as_str());
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Err(e) = std::fs::write(path, json.to_string()) {
        eprintln!("fetch_cards: erreur écriture fichier: {e}");
        return HttpResponse::InternalServerError().body(format!("Erreur écriture: {e}"));
    }
    if let Err(e) = card_cache.reload(path) {
        eprintln!("fetch_cards: erreur rechargement cache: {e}");
        return HttpResponse::InternalServerError().body(format!("Erreur cache: {e}"));
    }
    HttpResponse::Ok().body("Cartes sauvegardées dans cards.json")
}

#[get("/reload_cache_from_db")]
pub async fn reload_cache_from_db(
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis pour recharger le cache depuis la base.");
    };
    match db::load_all_cards(pool.get_ref()).await {
        Ok(cards) => {
            let n = cards.len();
            card_cache.replace_with(cards);
            HttpResponse::Ok()
                .content_type("text/plain; charset=utf-8")
                .body(format!("Cache rechargé depuis la base ({n} cartes)."))
        }
        Err(e) => {
            tracing::error!(error = %e, "reload_cache_from_db");
            HttpResponse::InternalServerError()
                .content_type("text/plain; charset=utf-8")
                .body(format!("Erreur lecture base: {e}"))
        }
    }
}

#[get("/enrich_ygorganization")]
pub async fn enrich_ygorganization(
    pool: Option<web::Data<sqlx::PgPool>>,
    query: web::Query<crate::ygorganization::EnrichQuery>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable().body("PostgreSQL requis pour l’enrichissement.");
    };
    let client = match crate::ygorganization::build_http_client() {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::InternalServerError().body(format!("Client HTTP reqwest: {e}"));
        }
    };
    match crate::ygorganization::run_enrichment(pool.get_ref(), &client, &query).await {
        Ok(stats) => HttpResponse::Ok()
            .content_type("text/plain; charset=utf-8")
            .body(stats.to_string()),
        Err(e) => {
            let code = match &e {
                crate::ygorganization::YgOrgError::BadQuery(_)
                | crate::ygorganization::YgOrgError::RevisionNotInitialized
                | crate::ygorganization::YgOrgError::NameIndexMissing
                | crate::ygorganization::YgOrgError::BadNameIndex => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            HttpResponse::build(code)
                .content_type("text/plain; charset=utf-8")
                .body(e.to_string())
        }
    }
}

fn csv_field(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\r') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

#[derive(Debug, Deserialize)]
pub struct PreviewCardMetadataFillQuery {
    #[serde(default = "preview_card_metadata_fill_default_max")]
    pub max: u32,
}

fn preview_card_metadata_fill_default_max() -> u32 {
    5000
}

#[get("/preview_card_metadata_fill")]
pub async fn preview_card_metadata_fill(
    pool: Option<web::Data<sqlx::PgPool>>,
    query: web::Query<PreviewCardMetadataFillQuery>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis pour la prévisualisation.");
    };
    let max_rows = query.max.min(100_000) as i64;
    let total = match db::count_archetype_fill_candidates(pool.get_ref()).await {
        Ok(n) => n,
        Err(e) => {
            return HttpResponse::InternalServerError()
                .content_type("text/plain; charset=utf-8")
                .body(format!("DB: {e}"));
        }
    };
    let rows = match db::list_archetype_fill_candidates(pool.get_ref(), max_rows).await {
        Ok(r) => r,
        Err(e) => {
            return HttpResponse::InternalServerError()
                .content_type("text/plain; charset=utf-8")
                .body(format!("DB: {e}"));
        }
    };
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
    HttpResponse::Ok()
        .content_type("text/plain; charset=utf-8")
        .body(out)
}

#[derive(Debug, Deserialize)]
pub struct ApplyCardMetadataFillQuery {
    #[serde(default = "apply_card_metadata_fill_default_max")]
    pub max: u32,
    pub write: Option<u8>,
}

fn apply_card_metadata_fill_default_max() -> u32 {
    500
}

#[get("/apply_card_metadata_fill")]
pub async fn apply_card_metadata_fill(
    pool: Option<web::Data<sqlx::PgPool>>,
    card_cache: web::Data<CardCache>,
    query: web::Query<ApplyCardMetadataFillQuery>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis.");
    };
    let max_rows = query.max.min(10_000) as i64;
    let do_write = query.write == Some(1);
    let rows = match db::list_archetype_fill_candidates_with_payload(pool.get_ref(), max_rows).await
    {
        Ok(r) => r,
        Err(e) => {
            return HttpResponse::InternalServerError()
                .content_type("text/plain; charset=utf-8")
                .body(format!("DB: {e}"));
        }
    };
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
                        pool.get_ref(),
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
                        Err(e) => {
                            return HttpResponse::InternalServerError()
                                .content_type("text/plain; charset=utf-8")
                                .body(format!("DB update id={}: {e}", r.id));
                        }
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
        let cards = match db::load_all_cards(pool.get_ref()).await {
            Ok(c) => c,
            Err(e) => {
                return HttpResponse::InternalServerError()
                    .content_type("text/plain; charset=utf-8")
                    .body(format!("Rechargement cache après écriture: {e}"));
            }
        };
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
    HttpResponse::Ok()
        .content_type("text/plain; charset=utf-8")
        .body(out)
}
