//! Synchronisation des cartes depuis l’**API JSON** YGOProDeck (`cardinfo.php` v7).
//!
//! Pas de scraping HTML : même source que [`crate::modules::admin_sync::fetch_cards`], mais utilisable
//! hors HTTP (Cloud Run **Job**, cron, `migrate`-like).
//!
//! URL surchargable avec `YGOPRODECK_CARDINFO_URL` (défaut : endpoint public v7).

use std::time::Duration;

use reqwest::Client;
use sqlx::PgPool;
use thiserror::Error;

use crate::db::{self, DbError};
use crate::ygo_api::CardsApiResponse;

/// URL par défaut : identique à l’historique `admin_sync::fetch_cards` (comportement inchangé).
pub const DEFAULT_YGOPRODECK_CARDINFO_URL: &str = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

const MAX_HTTP_ATTEMPTS: u32 = 4;
const HTTP_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Debug, Clone)]
pub struct CardSyncStats {
    pub card_rows: usize,
    pub cards_affected: u64,
    pub set_rows: usize,
    pub sets_affected: u64,
}

#[derive(Debug, Error)]
pub enum CardSyncError {
    #[error("client HTTP reqwest: {0}")]
    HttpClient(String),
    #[error("YGOProDeck: échec HTTP après {attempts} tentative(s), dernière erreur: {message}")]
    HttpRetry { attempts: u32, message: String },
    #[error("YGOProDeck: JSON invalide: {0}")]
    Json(#[from] serde_json::Error),
    #[error("YGOProDeck: réponse sans tableau `data` utilisable")]
    EmptyPayload,
    #[error(transparent)]
    Db(#[from] DbError),
}

fn ygoprodeck_url() -> String {
    std::env::var("YGOPRODECK_CARDINFO_URL")
        .unwrap_or_else(|_| DEFAULT_YGOPRODECK_CARDINFO_URL.to_string())
}

fn http_client() -> Result<Client, CardSyncError> {
    Client::builder()
        .timeout(HTTP_TIMEOUT)
        .user_agent(concat!(
            env!("CARGO_PKG_NAME"),
            "/",
            env!("CARGO_PKG_VERSION"),
            " sync-cards (+https://ygoprodeck.com)"
        ))
        .build()
        .map_err(|e| CardSyncError::HttpClient(e.to_string()))
}

/// GET avec retries (même politique que `sync-cards`). Public pour `sync-locales-ygo`.
pub async fn fetch_cardinfo_raw(url: &str) -> Result<String, CardSyncError> {
    fetch_body_with_retries(url).await
}

async fn fetch_body_with_retries(url: &str) -> Result<String, CardSyncError> {
    let client = http_client()?;
    let mut last_msg = String::new();

    for attempt in 1..=MAX_HTTP_ATTEMPTS {
        match client.get(url).send().await {
            Ok(response) => {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                if status.is_success() {
                    return Ok(body);
                }
                last_msg = format!("status {} — {}", status, truncate_body(&body));
                if attempt < MAX_HTTP_ATTEMPTS {
                    sleep_backoff(attempt).await;
                }
            }
            Err(e) => {
                last_msg = e.to_string();
                if attempt < MAX_HTTP_ATTEMPTS {
                    sleep_backoff(attempt).await;
                }
            }
        }
    }

    Err(CardSyncError::HttpRetry {
        attempts: MAX_HTTP_ATTEMPTS,
        message: last_msg,
    })
}

fn truncate_body(s: &str) -> String {
    let t = s.chars().take(400).collect::<String>();
    if s.len() > 400 { format!("{t}…") } else { t }
}

async fn sleep_backoff(attempt: u32) {
    let secs = (attempt as u64).saturating_mul(2).min(30);
    tokio::time::sleep(Duration::from_secs(secs.max(1))).await;
}

/// Télécharge `cardinfo`, parse, upsert `cards` + `card_sets`.
pub async fn sync_from_ygoprodeck(pool: &PgPool) -> Result<CardSyncStats, CardSyncError> {
    let url = ygoprodeck_url();
    tracing::info!(url = %url, "cards_sync: téléchargement YGOProDeck");

    let body = fetch_cardinfo_raw(&url).await?;
    let api: CardsApiResponse = serde_json::from_str(&body)?;

    if api.data.is_empty() {
        return Err(CardSyncError::EmptyPayload);
    }

    let card_rows: Vec<crate::ygo_api::CardUpsertRow> =
        api.data.iter().map(|c| c.to_upsert_row()).collect();
    let set_rows: Vec<crate::ygo_api::CardSetUpsertRow> =
        api.data.iter().flat_map(|c| c.card_set_rows()).collect();

    let n_cards = card_rows.len();
    let n_sets = set_rows.len();

    let cards_affected = db::upsert_cards(pool, &card_rows).await?;
    let sets_affected = db::upsert_card_sets(pool, &set_rows).await?;

    tracing::info!(
        cards = n_cards,
        cards_affected,
        set_rows = n_sets,
        sets_affected,
        "cards_sync: upsert terminé"
    );

    Ok(CardSyncStats {
        card_rows: n_cards,
        cards_affected,
        set_rows: n_sets,
        sets_affected,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_url_is_https_ygoprodeck() {
        assert!(DEFAULT_YGOPRODECK_CARDINFO_URL.contains("ygoprodeck.com"));
    }
}
