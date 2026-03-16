//! Téléchargement des bytes depuis une URL externe.

use tracing::instrument;

#[derive(Debug, thiserror::Error)]
pub enum FetchError {
    #[error("http: {0}")]
    Http(#[from] reqwest::Error),
    #[error("status: {0}")]
    Status(u16),
}

/// Télécharge les bytes d'une image depuis `url`.
#[instrument(skip_all, fields(url = %url))]
pub async fn fetch_image_bytes(url: &str) -> Result<Vec<u8>, FetchError> {
    let response = reqwest::get(url).await?;
    let status = response.status();
    if !status.is_success() {
        return Err(FetchError::Status(status.as_u16()));
    }
    let bytes = response.bytes().await?.to_vec();
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fetch_error_status_display() {
        let e = FetchError::Status(404);
        assert!(e.to_string().contains("404"));
    }
}
