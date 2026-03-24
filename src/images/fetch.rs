//! Téléchargement des bytes depuis une URL externe (politique d’URL + limite de taille).

use std::sync::OnceLock;
use std::time::Duration;

use futures::StreamExt;
use tracing::instrument;

#[derive(Debug, thiserror::Error)]
pub enum FetchError {
    #[error("url policy: {0}")]
    UrlPolicy(#[from] crate::images::url_policy::UrlPolicyError),
    #[error("http: {0}")]
    Http(#[from] reqwest::Error),
    #[error("status: {0}")]
    Status(u16),
    #[error("corps HTTP trop volumineux (max {max} octets)")]
    TooLarge { max: usize },
}

fn http_client() -> &'static reqwest::Client {
    static C: OnceLock<reqwest::Client> = OnceLock::new();
    C.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(45))
            .build()
            .expect("reqwest client")
    })
}

/// Plafond de téléchargement (octets), lu depuis `IMAGE_IMPORT_MAX_BYTES` ou défaut 15 MiB.
pub fn max_image_fetch_bytes_from_env() -> usize {
    const DEFAULT: usize = 15 * 1024 * 1024;
    const MIN: usize = 1024;
    const MAX: usize = 100 * 1024 * 1024;
    std::env::var("IMAGE_IMPORT_MAX_BYTES")
        .ok()
        .and_then(|s| s.parse().ok())
        .filter(|&n| (MIN..=MAX).contains(&n))
        .unwrap_or(DEFAULT)
}

/// Télécharge les bytes d’une image depuis `url_str` (validation URL + taille max).
#[instrument(skip_all, fields(url = %url_str))]
pub async fn fetch_image_bytes(url_str: &str) -> Result<Vec<u8>, FetchError> {
    let suffixes = crate::images::url_policy::allowed_host_suffixes_from_env();
    let url = crate::images::url_policy::validate_image_import_url(url_str, &suffixes)?;
    fetch_image_bytes_trusted(url.as_str()).await
}

/// À n’appeler qu’après [`crate::images::url_policy::validate_image_import_url`].
#[instrument(skip_all, fields(url = %url_as_str))]
pub async fn fetch_image_bytes_trusted(url_as_str: &str) -> Result<Vec<u8>, FetchError> {
    let max = max_image_fetch_bytes_from_env();
    fetch_image_bytes_inner(url_as_str, max).await
}

async fn fetch_image_bytes_inner(url_str: &str, max: usize) -> Result<Vec<u8>, FetchError> {
    let response = http_client().get(url_str).send().await?;
    let status = response.status();
    if !status.is_success() {
        return Err(FetchError::Status(status.as_u16()));
    }
    if let Some(cl) = response.content_length() {
        if cl as usize > max {
            return Err(FetchError::TooLarge { max });
        }
    }
    let mut stream = response.bytes_stream();
    let mut out = Vec::new();
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(FetchError::Http)?;
        if out.len() + chunk.len() > max {
            return Err(FetchError::TooLarge { max });
        }
        out.extend_from_slice(&chunk);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fetch_error_status_display() {
        let e = FetchError::Status(404);
        assert!(e.to_string().contains("404"));
    }

    #[test]
    fn max_bytes_default_when_env_missing() {
        // Ne pas dépendre d’une valeur précise si l’env est déjà défini dans l’environnement du test.
        let v = max_image_fetch_bytes_from_env();
        assert!(v >= 1024);
        assert!(v <= 100 * 1024 * 1024);
    }
}
