//! Client HTTP et parsing JSON YGResources (`db.ygoresources.com`).

use std::time::Duration;

use serde_json::Value;

use super::error_stats::YgOrgError;

pub const YGORG_API_BASE: &str = "https://db.ygoresources.com";

pub(super) const NAME_INDEX_EN_URL: &str = "https://db.ygoresources.com/data/idx/card/name/en";

/// Sonde révision cache (carte connue côté YGResources).
pub(super) const PROBE_YGORG_CARD_ID: i64 = 10000;

pub(super) const QA_RECENT_EN_URL: &str = "https://db.ygoresources.com/data/meta/recent/en/qa";

/// Timeout dédié au téléchargement de l’index noms (fichier volumineux).
pub(super) const SYNC_INDEX_DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(900);

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

pub(super) async fn fetch_recent_qa_ids(client: &reqwest::Client) -> Result<Vec<i64>, YgOrgError> {
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

pub(super) async fn fetch_qa_json(
    client: &reqwest::Client,
    qa_id: i64,
) -> Result<Value, YgOrgError> {
    let url = format!("{YGORG_API_BASE}/data/qa/{qa_id}");
    let res = client.get(url).send().await?.error_for_status()?;
    Ok(res.json().await?)
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
