//! Données **catalogue** du site officiel Konami (`db.yugioh-card.com`).
//!
//! - **Pas** de remplacement de l’API YGOProDeck pour le cœur métier (`sync-cards`).
//! - Utile pour l’**index des packs** officiels, extensions futures (cartes par pack), ou croisement avec `cards`.
//!
//! Le HTML du site peut changer : en cas d’échec de parse, le job échoue explicitement (à monitorer).

use std::time::Duration;

use reqwest::Client;
use scraper::{Html, Selector};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::PgPool;
use thiserror::Error;

use crate::db::{self, CardLocaleUpsertRow, DbError};

const MAX_HTTP_ATTEMPTS: u32 = 4;
const HTTP_TIMEOUT: Duration = Duration::from_secs(90);

/// URL liste des packs / recherche (alignée sur l’ancien scraper Python ; `?` simple).
/// Origine des pages catalogue (liste packs, pages pack, fiches cartes).
pub const KONAMI_SITE_BASE: &str = "https://www.db.yugioh-card.com";

pub fn pack_list_url(locale: &str) -> String {
    format!(
        "{KONAMI_SITE_BASE}/yugiohdb/card_list.action?clm=1&wname=CardSearch&request_locale={}",
        locale
    )
}

#[derive(Debug, Error)]
pub enum KonamiCatalogError {
    #[error("client HTTP: {0}")]
    HttpClient(String),
    #[error("Konami HTTP après {attempts} tentative(s): {message}")]
    HttpRetry { attempts: u32, message: String },
    #[error("parse HTML catalogue Konami: {0}")]
    Parse(String),
    #[error("snapshot Konami introuvable — lancer `konami-pack-index` pour la locale voulue: {0}")]
    SnapshotMissing(String),
    #[error("JSON snapshot Konami: {0}")]
    SnapshotJson(#[from] serde_json::Error),
    #[error(transparent)]
    Db(#[from] DbError),
}

fn http_client() -> Result<Client, KonamiCatalogError> {
    Client::builder()
        .timeout(HTTP_TIMEOUT)
        .user_agent(concat!(
            env!("CARGO_PKG_NAME"),
            "/",
            env!("CARGO_PKG_VERSION"),
            " konami-catalog"
        ))
        .build()
        .map_err(|e| KonamiCatalogError::HttpClient(e.to_string()))
}

async fn sleep_backoff(attempt: u32) {
    let secs = (attempt as u64).saturating_mul(2).min(30);
    tokio::time::sleep(Duration::from_secs(secs.max(1))).await;
}

async fn fetch_html(client: &Client, url: &str) -> Result<String, KonamiCatalogError> {
    let mut last = String::new();
    for attempt in 1..=MAX_HTTP_ATTEMPTS {
        match client.get(url).send().await {
            Ok(response) => {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                if status.is_success() {
                    return Ok(body);
                }
                last = format!("HTTP {} — {}", status, body.chars().take(200).collect::<String>());
            }
            Err(e) => {
                last = e.to_string();
            }
        }
        if attempt < MAX_HTTP_ATTEMPTS {
            sleep_backoff(attempt).await;
        }
    }
    Err(KonamiCatalogError::HttpRetry {
        attempts: MAX_HTTP_ATTEMPTS,
        message: last,
    })
}

fn normalize_pack_label(raw: &str) -> String {
    let line = raw
        .lines()
        .find(|l| !l.trim().is_empty())
        .unwrap_or(raw)
        .trim();
    line.chars()
        .map(|c| match c {
            '/' | ':' => '-',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Extrait les paires (libellé pack, `value` du formulaire) comme le script Python.
pub fn parse_pack_index_html(html: &str) -> Result<Vec<(String, String)>, KonamiCatalogError> {
    let sel_pack =
        Selector::parse("div.pack").map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;
    let sel_link =
        Selector::parse("input.link_value").map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;

    let document = Html::parse_document(html);

    let pack_labels: Vec<String> = document
        .select(&sel_pack)
        .map(|e| normalize_pack_label(&e.text().collect::<String>()))
        .filter(|s| !s.is_empty())
        .collect();

    let link_values: Vec<String> = document
        .select(&sel_link)
        .filter_map(|e| e.attr("value").map(str::to_owned))
        .collect();

    let n = pack_labels.len().min(link_values.len());
    if n == 0 {
        return Err(KonamiCatalogError::Parse(
            "aucun div.pack ou input.link_value — le HTML Konami a peut-être changé".into(),
        ));
    }

    if pack_labels.len() != link_values.len() {
        tracing::warn!(
            packs = pack_labels.len(),
            links = link_values.len(),
            "Konami: nombre de packs et de liens différent — troncature au minimum"
        );
    }

    Ok(pack_labels
        .into_iter()
        .zip(link_values.into_iter())
        .take(n)
        .collect())
}

fn packs_to_json(pairs: &[(String, String)]) -> Value {
    let arr: Vec<Value> = pairs
        .iter()
        .map(|(name, path)| {
            json!({
                "display_name": name,
                "relative_path": path,
            })
        })
        .collect();
    json!({
        "source": "konami_db_yugioh_card_com",
        "pack_count": arr.len(),
        "packs": arr,
    })
}

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
    db::upsert_konami_catalog_snapshot(
        pool,
        &snapshot_key,
        locale,
        "pack_index",
        &url,
        &payload,
    )
    .await?;

    tracing::info!(locale, packs = count, "konami_catalog: snapshot enregistré");
    Ok(count)
}

/// Construit une URL absolue Konami et assure `request_locale` (comportement aligné sur l’ancien scraper).
pub fn absolute_konami_url(relative_or_absolute: &str, locale: &str) -> String {
    let base = KONAMI_SITE_BASE.trim_end_matches('/');
    let mut u = if relative_or_absolute.starts_with("http://")
        || relative_or_absolute.starts_with("https://")
    {
        relative_or_absolute.to_string()
    } else {
        format!("{}{}", base, relative_or_absolute)
    };
    if u.contains("request_locale=") {
        return u;
    }
    let sep = if u.contains('?') { '&' } else { '?' };
    u.push_str(sep);
    u.push_str("request_locale=");
    u.push_str(locale);
    u
}

fn normalize_card_list_name(raw: &str) -> String {
    raw.lines()
        .map(str::trim)
        .find(|l| !l.is_empty())
        .unwrap_or(raw)
        .to_string()
}

/// Lignes `(nom affiché, chemin fiche)` sur une page **liste de cartes d’un pack**.
pub fn parse_pack_listing_card_rows(html: &str) -> Result<Vec<(String, String)>, KonamiCatalogError> {
    let sel_row =
        Selector::parse("div.t_row.c_normal.open").map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;
    let sel_name =
        Selector::parse("span.card_name").map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;
    let sel_link =
        Selector::parse("input.link_value").map_err(|e| KonamiCatalogError::Parse(e.to_string()))?;

    let doc = Html::parse_document(html);
    let mut out = Vec::new();
    for row in doc.select(&sel_row) {
        let name = row
            .select(&sel_name)
            .next()
            .map(|e| normalize_card_list_name(&e.text().collect::<String>()))
            .filter(|s| !s.is_empty());
        let path = row
            .select(&sel_link)
            .next()
            .and_then(|e| e.attr("value").map(str::to_owned))
            .filter(|s| s.starts_with('/'));
        if let (Some(n), Some(p)) = (name, path) {
            out.push((n, p));
        }
    }
    Ok(out)
}

/// Extrait un passcode 8 chiffres (première occurrence) et le bloc de texte carte (`dd.box_card_text`).
pub fn parse_card_detail_passcode_desc(html: &str) -> (Option<i64>, String) {
    use regex::Regex;
    let sel_dd = match Selector::parse("dd.box_card_text") {
        Ok(s) => s,
        Err(_) => return (None, String::new()),
    };
    let doc = Html::parse_document(html);
    let desc = doc
        .select(&sel_dd)
        .next()
        .map(|e| e.text().collect::<Vec<_>>().join("\n").trim().to_string())
        .unwrap_or_default();

    let re = Regex::new(r"\b([0-9]{8})\b").expect("static regex");
    let passcode = re
        .captures(html)
        .and_then(|c| c.get(1))
        .and_then(|m| m.as_str().parse::<i64>().ok());
    (passcode, desc)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_minimal_html() {
        let html = r#"
        <html><body>
          <div class="pack">Starter Deck A</div>
          <input class="link_value" value="/yugiohdb/foo.action?x=1" />
          <div class="pack">Booster B</div>
          <input class="link_value" value="/yugiohdb/bar.action?x=2" />
        </body></html>
        "#;
        let p = parse_pack_index_html(html).unwrap();
        assert_eq!(p.len(), 2);
        assert_eq!(p[0].0, "Starter Deck A");
        assert!(p[0].1.contains("foo.action"));
    }

    #[test]
    fn absolute_url_appends_request_locale() {
        let u = absolute_konami_url("/yugiohdb/x.action?a=1", "fr");
        assert!(u.starts_with(KONAMI_SITE_BASE));
        assert!(u.contains("request_locale=fr"));
    }

    #[test]
    fn parse_pack_listing_minimal() {
        let html = r#"
        <div class="t_row c_normal open">
          <span class="card_name">Ma carte</span>
          <input class="link_value" value="/yugiohdb/card.action?id=1" />
        </div>
        "#;
        let rows = parse_pack_listing_card_rows(html).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, "Ma carte");
        assert!(rows[0].1.contains("card.action"));
    }

    #[test]
    fn parse_detail_passcode_and_desc() {
        let html = r#"
        <html><body>
          <dd class="box_card_text c_text flex_1">Effet de test.</dd>
          <p>Pas de huit chiffres d’affilée avant la ligne suivante.</p>
          <span>87654321</span>
        </body></html>
        "#;
        let (pc, desc) = parse_card_detail_passcode_desc(html);
        assert_eq!(pc, Some(87_654_321));
        assert!(desc.contains("Effet"));
    }
}
