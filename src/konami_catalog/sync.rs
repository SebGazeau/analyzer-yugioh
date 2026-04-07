//! Jobs : index des packs et synchronisation `card_locales`.

use std::time::Duration;

use serde::Deserialize;
use serde_json::Value;
use sqlx::PgPool;

use crate::db::{self, CardLocaleUpsertRow};

use super::config::pack_list_url;
use super::error::KonamiCatalogError;
use super::http::{fetch_html, http_client};
use super::scrape::{
    absolute_konami_url, packs_to_json, parse_card_detail_passcode_desc, parse_pack_index_html,
    parse_pack_listing_card_rows,
};

/// Télécharge la page liste, parse, persiste `snapshot_key = pack_index:{locale}`.
pub async fn sync_pack_index(pool: &PgPool, locale: &str) -> Result<usize, KonamiCatalogError> {
    let client = http_client()?;
    let url = pack_list_url(locale);
    tracing::info!(%url, "konami_catalog: téléchargement index packs");

    let html = fetch_html(&client, &url).await?;
    let pairs = parse_pack_index_html(&html)?;
    let count = pairs.len();
    let payload = packs_to_json(&pairs);

    let snapshot_key = format!("pack_index:{locale}");
    db::upsert_konami_catalog_snapshot(pool, &snapshot_key, locale, "pack_index", &url, &payload)
        .await?;

    tracing::info!(locale, packs = count, "konami_catalog: snapshot enregistré");
    Ok(count)
}

#[derive(Debug, Deserialize)]
struct SnapshotPackRef {
    #[serde(default)]
    display_name: String,
    relative_path: String,
}

/// Statistiques après parcours packs → fiches → `card_locales`.
#[derive(Debug, Default, Clone)]
pub struct KonamiLocaleSyncStats {
    pub packs_processed: usize,
    pub listing_rows_seen: usize,
    pub detail_fetches: usize,
    pub rows_upserted: u64,
    pub skipped_no_passcode: usize,
    pub skipped_unknown_card_id: usize,
}

/// Lit `pack_index:{locale}` en base, parcourt les pages pack puis les fiches ; upsert `source = konami_official`.
///
/// Exiger `konami-pack-index` au préalable pour la même `locale`. Limiter la charge avec
/// `max_packs` / `max_detail_fetches` (tests ou jobs partiels).
pub async fn sync_pack_card_locales(
    pool: &PgPool,
    locale: &str,
    max_packs: Option<usize>,
    max_detail_fetches: Option<usize>,
    delay: Duration,
) -> Result<KonamiLocaleSyncStats, KonamiCatalogError> {
    let snapshot_key = format!("pack_index:{locale}");
    let payload = db::get_konami_catalog_snapshot_json(pool, &snapshot_key)
        .await?
        .ok_or_else(|| KonamiCatalogError::SnapshotMissing(snapshot_key.clone()))?;

    let arr = payload
        .get("packs")
        .and_then(|v| v.as_array())
        .ok_or_else(|| KonamiCatalogError::Parse("snapshot sans tableau `packs`".into()))?;

    let packs: Vec<SnapshotPackRef> = serde_json::from_value(Value::Array(arr.clone()))?;

    if packs.is_empty() {
        return Err(KonamiCatalogError::Parse(
            "snapshot `packs` vide — relancer konami-pack-index".into(),
        ));
    }

    let existing_ids = db::list_card_ids(pool).await?;
    let client = http_client()?;

    let pack_take = max_packs.unwrap_or(usize::MAX);
    let mut detail_budget = max_detail_fetches.unwrap_or(usize::MAX);
    let mut stats = KonamiLocaleSyncStats::default();
    let mut pending: Vec<CardLocaleUpsertRow> = Vec::new();

    'outer: for pack in packs.iter().take(pack_take) {
        if detail_budget == 0 {
            break;
        }
        let list_url = absolute_konami_url(&pack.relative_path, locale);
        tracing::debug!(pack = %pack.display_name, %list_url, "konami: page liste pack");
        let list_html = fetch_html(&client, &list_url).await?;
        tokio::time::sleep(delay).await;

        stats.packs_processed += 1;
        let card_rows = parse_pack_listing_card_rows(&list_html)?;
        stats.listing_rows_seen += card_rows.len();

        for (list_name, rel_detail) in card_rows {
            if detail_budget == 0 {
                break 'outer;
            }
            detail_budget -= 1;
            stats.detail_fetches += 1;

            let detail_url = absolute_konami_url(&rel_detail, locale);
            tokio::time::sleep(delay).await;
            let detail_html = fetch_html(&client, &detail_url).await?;
            let (passcode, desc) = parse_card_detail_passcode_desc(&detail_html);

            let Some(pid) = passcode else {
                stats.skipped_no_passcode += 1;
                continue;
            };
            if !existing_ids.contains(&pid) {
                stats.skipped_unknown_card_id += 1;
                continue;
            }

            pending.push(CardLocaleUpsertRow {
                card_id: pid,
                locale: locale.to_string(),
                name: list_name,
                card_desc: desc,
                source: "konami_official".into(),
            });

            const FLUSH: usize = 400;
            if pending.len() >= FLUSH {
                stats.rows_upserted += db::upsert_card_locales(pool, &pending).await?;
                pending.clear();
            }
        }
    }

    if !pending.is_empty() {
        stats.rows_upserted += db::upsert_card_locales(pool, &pending).await?;
    }

    Ok(stats)
}
