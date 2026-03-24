//! Client HTTP pour l’API JSON documentée sous **YGOrganization** (`db.ygorganization.com/about/api`).
//! Réponses servies sur **`db.ygoresources.com`**.
//!
//! Les **IDs dans `/data/card/{id}`** sont les IDs internes YGResources, **pas** les passcodes YGOProDeck.
//! On résout via **`/data/idx/card/name/en`** (sync locale en base) puis nom EN / `name` de `cards`.

use std::time::Duration;

use serde::Deserialize;
use serde_json::Value;

use crate::db::{
    self, DbError, YGORG_ENRICHMENT_SOURCE, YGORG_LAYER_CARD_RAW, YgOrgBackfillCardRow,
};

pub const YGORG_API_BASE: &str = "https://db.ygoresources.com";

const NAME_INDEX_EN_URL: &str = "https://db.ygoresources.com/data/idx/card/name/en";

/// Sonde révision cache (carte connue côté YGResources).
const PROBE_YGORG_CARD_ID: i64 = 10000;

const FETCH_INTERVAL: Duration = Duration::from_millis(120);

const QA_RECENT_EN_URL: &str = "https://db.ygoresources.com/data/meta/recent/en/qa";

/// Timeout dédié au téléchargement de l’index noms (fichier volumineux).
const SYNC_INDEX_DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(900);

#[derive(Debug, thiserror::Error)]
pub enum YgOrgError {
    #[error("HTTP: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("base de données: {0}")]
    Db(#[from] DbError),
    #[error("en-tête X-Cache-Revision manquant ou invalide")]
    MissingRevision,
    #[error("manifest: JSON inattendu (attendu: objet avec data.card)")]
    BadManifest,
    #[error("révision cache non initialisée : appelez d'abord mode=init")]
    RevisionNotInitialized,
    #[error("index nom EN vide : exécutez d'abord mode=sync_index")]
    NameIndexMissing,
    #[error("index nom : JSON racine attendu (objet)")]
    BadNameIndex,
    #[error("{0}")]
    BadQuery(String),
}

#[derive(Debug, Default, Clone)]
pub struct RunStats {
    pub mode: &'static str,
    pub fetched_ok: u32,
    pub fetch_errors: u32,
    pub skipped_unknown_id: u32,
    pub manifest_card_ids: u32,
    pub remaining_manifest_hint: u32,
    pub cache_revision_before: Option<i64>,
    pub cache_revision_after: Option<i64>,
    /// Entrées `(nom, id)` insérées lors de `sync_index`.
    pub sync_index_pairs: u32,
    /// Backfill : nom absent de `ygorg_en_name_index`.
    pub name_not_in_index: u32,
    /// `sync_qa` : entrées Q&A upsertées.
    pub qa_upserted: u32,
    /// `sync_qa` : échecs (HTTP ou JSON sans `cards`).
    pub qa_fetch_errors: u32,
    pub message: Option<String>,
}

impl std::fmt::Display for RunStats {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "mode={}", self.mode)?;
        writeln!(f, "fetched_ok={}", self.fetched_ok)?;
        writeln!(f, "fetch_errors={}", self.fetch_errors)?;
        writeln!(f, "skipped_unknown_id={}", self.skipped_unknown_id)?;
        writeln!(f, "manifest_card_ids={}", self.manifest_card_ids)?;
        writeln!(
            f,
            "remaining_manifest_hint={}",
            self.remaining_manifest_hint
        )?;
        writeln!(f, "sync_index_pairs={}", self.sync_index_pairs)?;
        writeln!(f, "name_not_in_index={}", self.name_not_in_index)?;
        writeln!(f, "qa_upserted={}", self.qa_upserted)?;
        writeln!(f, "qa_fetch_errors={}", self.qa_fetch_errors)?;
        writeln!(f, "cache_revision_before={:?}", self.cache_revision_before)?;
        writeln!(f, "cache_revision_after={:?}", self.cache_revision_after)?;
        if let Some(m) = &self.message {
            writeln!(f, "message={m}")?;
        }
        Ok(())
    }
}

pub fn build_http_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .user_agent(concat!(
            "analyzer-yugioh/",
            env!("CARGO_PKG_VERSION"),
            " (enrichment; contact via repo)"
        ))
        .timeout(Duration::from_secs(120))
        .connect_timeout(Duration::from_secs(30))
        .build()
}

fn parse_cache_revision(resp: &reqwest::Response) -> Result<i64, YgOrgError> {
    let raw = resp
        .headers()
        .get("x-cache-revision")
        .and_then(|v| v.to_str().ok())
        .ok_or(YgOrgError::MissingRevision)?;
    raw.trim()
        .parse::<i64>()
        .map_err(|_| YgOrgError::MissingRevision)
}

pub async fn fetch_card_json(
    client: &reqwest::Client,
    ygorg_internal_id: i64,
) -> Result<(serde_json::Value, i64), YgOrgError> {
    let url = format!("{YGORG_API_BASE}/data/card/{ygorg_internal_id}");
    let res = client.get(url).send().await?.error_for_status()?;
    let rev = parse_cache_revision(&res)?;
    let body: serde_json::Value = res.json().await?;
    Ok((body, rev))
}

pub async fn fetch_manifest(
    client: &reqwest::Client,
    cache_revision: i64,
) -> Result<Option<serde_json::Value>, YgOrgError> {
    let url = format!("{YGORG_API_BASE}/manifest/{cache_revision}");
    let res = client.get(url).send().await?.error_for_status()?;
    let v: serde_json::Value = res.json().await?;
    if v.is_null() {
        return Ok(None);
    }
    Ok(Some(v))
}

pub fn parse_manifest_card_ids(manifest: &serde_json::Value) -> Result<Vec<i64>, YgOrgError> {
    let Some(card_obj) = manifest
        .get("data")
        .and_then(|d| d.get("card"))
        .and_then(|c| c.as_object())
    else {
        return Err(YgOrgError::BadManifest);
    };
    let mut ids: Vec<i64> = card_obj
        .keys()
        .filter_map(|k| k.parse::<i64>().ok())
        .collect();
    ids.sort_unstable();
    ids.dedup();
    Ok(ids)
}

/// Aplatit `/data/idx/card/name/en` : chaque entrée du tableau pour un nom devient une ligne.
/// Parse `GET /data/qa/{id}` : `cards` (ids YGOrg) et id canonique depuis `qaData.en.id`.
pub fn parse_qa_detail(value: &Value, request_qa_id: i64) -> Option<(i64, Vec<i64>)> {
    let cards = value.get("cards")?.as_array()?;
    let mut ids: Vec<i64> = Vec::new();
    for x in cards {
        if let Some(n) = x.as_i64() {
            ids.push(n);
        } else if let Some(u) = x.as_u64() {
            ids.push(u as i64);
        }
    }
    if ids.is_empty() {
        return None;
    }
    let qid = value
        .pointer("/qaData/en/id")
        .and_then(|x| x.as_i64().or_else(|| x.as_u64().map(|u| u as i64)))
        .unwrap_or(request_qa_id);
    Some((qid, ids))
}

async fn fetch_recent_qa_ids(client: &reqwest::Client) -> Result<Vec<i64>, YgOrgError> {
    let res = client
        .get(QA_RECENT_EN_URL)
        .timeout(Duration::from_secs(120))
        .send()
        .await?
        .error_for_status()?;
    let v: Value = res.json().await?;
    let arr = v.as_array().ok_or_else(|| {
        YgOrgError::BadQuery("GET meta/recent/en/qa : JSON tableau attendu".into())
    })?;
    Ok(arr
        .iter()
        .filter_map(|x| x.as_i64().or_else(|| x.as_u64().map(|u| u as i64)))
        .collect())
}

async fn fetch_qa_json(client: &reqwest::Client, qa_id: i64) -> Result<Value, YgOrgError> {
    let url = format!("{YGORG_API_BASE}/data/qa/{qa_id}");
    let res = client.get(url).send().await?.error_for_status()?;
    Ok(res.json().await?)
}

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

pub fn parse_ygorg_en_name_index(value: &Value) -> Result<Vec<(String, i64)>, YgOrgError> {
    let obj = value.as_object().ok_or(YgOrgError::BadNameIndex)?;
    let mut out = Vec::new();
    for (key, v) in obj {
        match v {
            Value::Array(arr) => {
                for x in arr {
                    if let Some(id) = x.as_i64() {
                        out.push((key.clone(), id));
                    } else if let Some(u) = x.as_u64() {
                        out.push((key.clone(), u as i64));
                    }
                }
            }
            Value::Number(n) => {
                if let Some(id) = n.as_i64() {
                    out.push((key.clone(), id));
                } else if let Some(u) = n.as_u64() {
                    out.push((key.clone(), u as i64));
                }
            }
            _ => {}
        }
    }
    Ok(out)
}

/// Nom utilisé pour l’index EN : `name_en` non vide sinon `name` (trim).
pub fn ygorg_lookup_name(name: &str, name_en: Option<&str>) -> String {
    let en = name_en.map(str::trim).filter(|s| !s.is_empty());
    if let Some(n) = en {
        return n.to_string();
    }
    name.trim().to_string()
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

#[cfg(test)]
mod tests {
    use super::{parse_manifest_card_ids, parse_ygorg_en_name_index};
    use serde_json::json;

    #[test]
    fn manifest_extracts_sorted_unique_ids() {
        let v = json!({
            "data": {
                "card": {
                    "103": 1,
                    "7": 1,
                    "42": 1
                }
            }
        });
        let ids = parse_manifest_card_ids(&v).expect("parse");
        assert_eq!(ids, vec![7, 42, 103]);
    }

    #[test]
    fn name_index_flattens_arrays_and_numbers() {
        let v = json!({
            "A": [1_i64, 2_i64],
            "B": 3_i64
        });
        let mut rows = parse_ygorg_en_name_index(&v).expect("parse");
        rows.sort();
        assert_eq!(
            rows,
            vec![("A".into(), 1), ("A".into(), 2), ("B".into(), 3),]
        );
    }

    #[test]
    fn ygorg_lookup_name_prefers_name_en() {
        assert_eq!(
            super::ygorg_lookup_name("Français", Some("Dark Magician")),
            "Dark Magician"
        );
        assert_eq!(super::ygorg_lookup_name("Soleil", None), "Soleil");
    }

    #[test]
    fn parse_qa_detail_reads_cards_and_id() {
        let v = json!({
            "cards": [12749, 12750],
            "qaData": { "en": { "id": 999, "question": "Q" } }
        });
        let (qid, c) = super::parse_qa_detail(&v, 1).expect("parse");
        assert_eq!(qid, 999);
        assert_eq!(c, vec![12749, 12750]);
        let fallback = json!({ "cards": [1_i64] });
        let (qid2, c2) = super::parse_qa_detail(&fallback, 42).expect("parse");
        assert_eq!(qid2, 42);
        assert_eq!(c2, vec![1_i64]);
    }

    #[test]
    fn parse_qa_detail_none_when_no_numeric_cards() {
        assert!(super::parse_qa_detail(&json!({ "cards": [] }), 1).is_none());
        assert!(super::parse_qa_detail(&json!({ "cards": ["x", null] }), 1).is_none());
        assert!(super::parse_qa_detail(&json!({}), 1).is_none());
    }
}
