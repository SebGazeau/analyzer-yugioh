//! Client HTTP avec retry pour les pages Konami.

use std::time::Duration;

use reqwest::Client;

use super::config::{HTTP_TIMEOUT, MAX_HTTP_ATTEMPTS};
use super::error::KonamiCatalogError;

pub(super) fn http_client() -> Result<Client, KonamiCatalogError> {
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

pub(super) async fn fetch_html(client: &Client, url: &str) -> Result<String, KonamiCatalogError> {
    let mut last = String::new();
    for attempt in 1..=MAX_HTTP_ATTEMPTS {
        match client.get(url).send().await {
            Ok(response) => {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                if status.is_success() {
                    return Ok(body);
                }
                last = format!(
                    "HTTP {} — {}",
                    status,
                    body.chars().take(200).collect::<String>()
                );
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
