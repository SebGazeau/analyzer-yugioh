//! Modes d’enrichissement (init, index, manifest, backfill, Q&A).

use std::time::Duration;

use serde::Deserialize;
use serde_json::Value;

use crate::db::{self, YGORG_ENRICHMENT_SOURCE, YGORG_LAYER_CARD_RAW, YgOrgBackfillCardRow};

use super::error_stats::{RunStats, YgOrgError};
use super::http::{
    NAME_INDEX_EN_URL, PROBE_YGORG_CARD_ID, SYNC_INDEX_DOWNLOAD_TIMEOUT, fetch_card_json,
    fetch_manifest, fetch_qa_json, fetch_recent_qa_ids, parse_manifest_card_ids, parse_qa_detail,
    parse_ygorg_en_name_index, ygorg_lookup_name,
};

const FETCH_INTERVAL: Duration = Duration::from_millis(120);

/// Télécharge les `max` premiers Q&A de la liste « recent EN » et upsert `ygorg_qa_entries`.
pub async fn run_sync_recent_qa(
    pool: &sqlx::PgPool,
    client: &reqwest::Client,
    max_fetch: u32,
) -> Result<RunStats, YgOrgError> {
    let mut ids = fetch_recent_qa_ids(client).await?;
    ids.truncate(max_fetch as usize);
    let list_len = ids.len() as u32;
    let mut stats = RunStats {
        mode: "sync_qa",
        ..Default::default()
    };

    for (i, qid) in ids.iter().enumerate() {
        if i > 0 {
            tokio::time::sleep(FETCH_INTERVAL).await;
        }
        match fetch_qa_json(client, *qid).await {
            Ok(v) => match parse_qa_detail(&v, *qid) {
                Some((canonical_id, related)) => {
                    match db::upsert_ygorg_qa_entry(pool, canonical_id, &related).await {
                        Ok(()) => stats.qa_upserted += 1,
                        Err(e) => {
                            stats.qa_fetch_errors += 1;
                            tracing::warn!(qa_id = *qid, "qa upsert: {}", e);
                        }
                    }
                }
                None => stats.qa_fetch_errors += 1,
            },
            Err(e) => {
                stats.qa_fetch_errors += 1;
                tracing::warn!(qa_id = *qid, "qa fetch: {}", e);
            }
        }
    }

    let total = db::count_ygorg_qa_entries(pool).await.unwrap_or(-1);
    stats.message = Some(format!(
        "sync_qa : {} upserts OK, {} erreurs, {} ids parcourus, COUNT(ygorg_qa_entries)={}",
        stats.qa_upserted, stats.qa_fetch_errors, list_len, total
    ));
    Ok(stats)
}

pub async fn run_sync_index_mode(
    pool: &sqlx::PgPool,
    client: &reqwest::Client,
) -> Result<RunStats, YgOrgError> {
    let cleared = db::clear_ygorg_unresolved(pool).await?;
    db::truncate_ygorg_name_index(pool).await?;

    let bytes = client
        .get(NAME_INDEX_EN_URL)
        .timeout(SYNC_INDEX_DOWNLOAD_TIMEOUT)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?;

    let value: Value = serde_json::from_slice(&bytes)?;
    let rows = parse_ygorg_en_name_index(&value)?;
    let n_pairs = rows.len() as u32;
    let inserted = db::insert_ygorg_name_index_rows(pool, &rows).await? as u32;

    let count = db::count_ygorg_name_index_rows(pool).await? as u32;

    Ok(RunStats {
        mode: "sync_index",
        sync_index_pairs: n_pairs,
        message: Some(format!(
            "index EN chargé : {n_pairs} paires parsées, {inserted} insertions, unresolved effacés={cleared}, COUNT table={count}"
        )),
        ..Default::default()
    })
}

pub async fn run_init_revision(
    pool: &sqlx::PgPool,
    client: &reqwest::Client,
) -> Result<RunStats, YgOrgError> {
    let before = db::get_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE).await?;
    let (_json, rev) = fetch_card_json(client, PROBE_YGORG_CARD_ID).await?;
    db::set_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE, rev).await?;
    let after = db::get_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE).await?;
    Ok(RunStats {
        mode: "init",
        cache_revision_before: before,
        cache_revision_after: after,
        message: Some(format!(
            "révision enregistrée depuis sonde ygorg_id={PROBE_YGORG_CARD_ID}"
        )),
        ..Default::default()
    })
}

async fn store_card_payload(
    pool: &sqlx::PgPool,
    card_id: i64,
    payload: &serde_json::Value,
) -> Result<(), YgOrgError> {
    db::upsert_card_enrichment_layer(
        pool,
        card_id,
        YGORG_ENRICHMENT_SOURCE,
        YGORG_LAYER_CARD_RAW,
        payload,
    )
    .await?;
    Ok(())
}

async fn backfill_one_card(
    pool: &sqlx::PgPool,
    client: &reqwest::Client,
    row: &YgOrgBackfillCardRow,
    stats: &mut RunStats,
) {
    let key = ygorg_lookup_name(&row.name, row.name_en.as_deref());
    if key.is_empty() {
        stats.name_not_in_index += 1;
        let _ = db::mark_ygorg_unresolved(pool, row.id, "empty_name").await;
        tracing::warn!(card_id = row.id, "ygorg backfill: nom vide");
        return;
    }

    let ygorg_id = match db::lookup_ygorg_id_by_exact_name(pool, &key).await {
        Ok(Some(id)) => id,
        Ok(None) => {
            stats.name_not_in_index += 1;
            let _ = db::mark_ygorg_unresolved(pool, row.id, "name_not_in_index").await;
            tracing::debug!(card_id = row.id, name = %key, "ygorg: nom absent de l’index EN");
            return;
        }
        Err(e) => {
            stats.fetch_errors += 1;
            tracing::warn!(card_id = row.id, "ygorg lookup DB: {}", e);
            return;
        }
    };

    match fetch_card_json(client, ygorg_id).await {
        Ok((json, rev)) => {
            if store_card_payload(pool, row.id, &json).await.is_ok() {
                let _ = db::upsert_card_ygorg_id_map(pool, row.id, ygorg_id).await;
                stats.fetched_ok += 1;
                let _ = db::set_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE, rev).await;
                stats.cache_revision_after = Some(rev);
            } else {
                stats.fetch_errors += 1;
            }
        }
        Err(e) => {
            stats.fetch_errors += 1;
            tracing::warn!(card_id = row.id, ygorg_id, "ygorg fetch carte: {}", e);
        }
    }
}

pub async fn run_manifest_mode(
    pool: &sqlx::PgPool,
    client: &reqwest::Client,
    max_fetch: u32,
) -> Result<RunStats, YgOrgError> {
    if db::count_ygorg_name_index_rows(pool).await? == 0 {
        return Err(YgOrgError::NameIndexMissing);
    }

    let rev = match db::get_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE).await? {
        Some(r) if r > 0 => r,
        _ => return Err(YgOrgError::RevisionNotInitialized),
    };
    let before = Some(rev);
    let mut stats = RunStats {
        mode: "manifest",
        cache_revision_before: before,
        ..Default::default()
    };

    let Some(manifest) = fetch_manifest(client, rev).await? else {
        stats.message =
            Some("manifest null — déjà à jour par rapport à la révision stockée".into());
        stats.cache_revision_after = before;
        return Ok(stats);
    };

    let ygorg_ids = parse_manifest_card_ids(&manifest)?;
    stats.manifest_card_ids = ygorg_ids.len() as u32;

    let mut work: Vec<(i64, Vec<i64>)> = Vec::new();
    for yid in &ygorg_ids {
        let ours = db::list_card_ids_by_ygorg_internal_id(pool, *yid).await?;
        if ours.is_empty() {
            stats.skipped_unknown_id += 1;
        } else {
            work.push((*yid, ours));
        }
    }

    if work.is_empty() {
        let (_j, new_rev) = fetch_card_json(client, PROBE_YGORG_CARD_ID).await?;
        db::set_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE, new_rev).await?;
        stats.cache_revision_after = Some(new_rev);
        stats.message = Some(
            "aucun id manifest ne correspond à card_ygorg_id_map — révision avancée via sonde"
                .into(),
        );
        return Ok(stats);
    }

    let cap = max_fetch as usize;
    let batch: Vec<(i64, Vec<i64>)> = work.iter().take(cap).cloned().collect();
    let rest = work.len().saturating_sub(batch.len());

    let mut last_rev: Option<i64> = None;
    for (i, (ygorg_id, our_ids)) in batch.iter().enumerate() {
        if i > 0 {
            tokio::time::sleep(FETCH_INTERVAL).await;
        }
        match fetch_card_json(client, *ygorg_id).await {
            Ok((json, r)) => {
                let mut any = false;
                for cid in our_ids {
                    if store_card_payload(pool, *cid, &json).await.is_ok() {
                        let _ = db::upsert_card_ygorg_id_map(pool, *cid, *ygorg_id).await;
                        stats.fetched_ok += 1;
                        any = true;
                    } else {
                        stats.fetch_errors += 1;
                    }
                }
                if any {
                    last_rev = Some(r);
                }
            }
            Err(e) => {
                stats.fetch_errors += 1;
                tracing::warn!(ygorg_id, "ygorg manifest fetch: {}", e);
            }
        }
    }

    stats.remaining_manifest_hint = rest as u32;

    if rest == 0 {
        if let Some(new_rev) = last_rev {
            db::set_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE, new_rev).await?;
            stats.cache_revision_after = Some(new_rev);
            stats.message = Some("manifest entièrement traité ; révision mise à jour".into());
        } else {
            let (_j, new_rev) = fetch_card_json(client, PROBE_YGORG_CARD_ID).await?;
            db::set_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE, new_rev).await?;
            stats.cache_revision_after = Some(new_rev);
            stats.message = Some(
                "manifest terminé sans réponse carte utile — révision avancée via sonde".into(),
            );
        }
    } else {
        stats.cache_revision_after = before;
        stats.message = Some(format!(
            "lot partiel ({}/{}) — révision inchangée ; relancer",
            batch.len(),
            work.len()
        ));
    }

    Ok(stats)
}

pub async fn run_backfill_mode(
    pool: &sqlx::PgPool,
    client: &reqwest::Client,
    max_fetch: u32,
) -> Result<RunStats, YgOrgError> {
    if db::count_ygorg_name_index_rows(pool).await? == 0 {
        return Err(YgOrgError::NameIndexMissing);
    }

    let before = db::get_external_cache_revision(pool, YGORG_ENRICHMENT_SOURCE).await?;
    let rows = db::list_cards_for_ygorg_backfill(
        pool,
        YGORG_ENRICHMENT_SOURCE,
        YGORG_LAYER_CARD_RAW,
        i64::from(max_fetch),
    )
    .await?;

    let mut stats = RunStats {
        mode: "backfill",
        cache_revision_before: before,
        ..Default::default()
    };

    for (i, row) in rows.iter().enumerate() {
        if i > 0 {
            tokio::time::sleep(FETCH_INTERVAL).await;
        }
        backfill_one_card(pool, client, row, &mut stats).await;
    }

    if stats.fetched_ok > 0 {
        stats.message = Some(
            "backfill : résolution par nom EN / name ; révision = dernière réponse carte".into(),
        );
    } else if stats.name_not_in_index > 0 && stats.fetch_errors == 0 {
        stats.message = Some(
            "aucun fetch : noms absents de l’index — vérifier sync_index ou noms YGOProDeck".into(),
        );
        stats.cache_revision_after = before;
    } else if stats.fetch_errors > 0 && stats.fetched_ok == 0 {
        stats.message = Some("échecs réseau ou DB — voir logs".into());
        stats.cache_revision_after = before;
    } else {
        stats.message = Some("rien à remplir (déjà enrichi ou tout en unresolved)".into());
        stats.cache_revision_after = before;
    }

    Ok(stats)
}

#[derive(Debug, Deserialize)]
pub struct EnrichQuery {
    #[serde(default = "default_max")]
    pub max: u32,
    #[serde(default)]
    pub mode: String,
}

fn default_max() -> u32 {
    50
}

pub fn clamp_max(max: u32) -> u32 {
    max.clamp(1, 500)
}

pub async fn run_enrichment(
    pool: &sqlx::PgPool,
    client: &reqwest::Client,
    query: &EnrichQuery,
) -> Result<RunStats, YgOrgError> {
    let max_fetch = clamp_max(query.max);
    let mode = query.mode.trim().to_ascii_lowercase();
    match mode.as_str() {
        "init" => run_init_revision(pool, client).await,
        "sync_index" => run_sync_index_mode(pool, client).await,
        "manifest" => run_manifest_mode(pool, client, max_fetch).await,
        "backfill" => run_backfill_mode(pool, client, max_fetch).await,
        "sync_qa" => run_sync_recent_qa(pool, client, max_fetch).await,
        "" => Err(YgOrgError::BadQuery(
            "paramètre « mode » requis : init | sync_index | backfill | manifest | sync_qa".into(),
        )),
        _ => Err(YgOrgError::BadQuery(format!(
            "mode inconnu « {mode} » (init | sync_index | backfill | manifest | sync_qa)"
        ))),
    }
}
