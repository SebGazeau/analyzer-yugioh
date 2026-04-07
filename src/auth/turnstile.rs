//! Vérification Cloudflare Turnstile (widget + `siteverify`).

use std::sync::OnceLock;

use reqwest::Client;
use serde::{Deserialize, Serialize};

const SITEVERIFY_URL: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

fn shared_client() -> &'static Client {
    static CLIENT: OnceLock<Client> = OnceLock::new();
    CLIENT.get_or_init(Client::new)
}

/// Clés Turnstile (optionnelles : si les deux sont absentes, l’inscription ne demande pas de widget).
#[derive(Debug, Clone, Default)]
pub struct TurnstileConfig {
    pub site_key: Option<String>,
    pub secret_key: Option<String>,
}

impl TurnstileConfig {
    pub fn from_env() -> Self {
        fn trim_opt(name: &str) -> Option<String> {
            std::env::var(name)
                .ok()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        }
        let site_key = trim_opt("TURNSTILE_SITE_KEY");
        let secret_key = trim_opt("TURNSTILE_SECRET_KEY");
        if site_key.is_some() != secret_key.is_some() {
            tracing::warn!(
                "Turnstile : définir les deux variables TURNSTILE_SITE_KEY et TURNSTILE_SECRET_KEY, ou aucune."
            );
        }
        Self {
            site_key,
            secret_key,
        }
    }

    /// Aucune vérification (tests, dev sans clés).
    pub fn disabled() -> Self {
        Self::default()
    }

    pub fn enabled(&self) -> bool {
        self.site_key.is_some() && self.secret_key.is_some()
    }
}

#[derive(Serialize)]
struct SiteverifyRequest<'a> {
    secret: &'a str,
    response: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    remoteip: Option<&'a str>,
}

#[derive(Debug, Deserialize)]
struct SiteverifyBody {
    success: bool,
    #[serde(default, rename = "error-codes")]
    error_codes: Vec<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum TurnstileVerifyError {
    #[error("requête Turnstile: {0}")]
    Http(#[from] reqwest::Error),
    #[error("réponse Turnstile illisible")]
    InvalidJson(#[from] serde_json::Error),
}

/// Vérifie le jeton renvoyé par le widget. `remote_ip` est optionnel (recommandé si disponible).
pub async fn verify_token(
    secret: &str,
    token: &str,
    remote_ip: Option<&str>,
) -> Result<bool, TurnstileVerifyError> {
    let client = shared_client();
    let req = SiteverifyRequest {
        secret,
        response: token,
        remoteip: remote_ip.filter(|s| !s.is_empty()),
    };
    let res = client.post(SITEVERIFY_URL).form(&req).send().await?;
    let body: SiteverifyBody = res.json().await?;
    if !body.success {
        tracing::debug!("turnstile siteverify failed: {:?}", body.error_codes);
    }
    Ok(body.success)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disabled_when_empty() {
        let c = TurnstileConfig::default();
        assert!(!c.enabled());
    }

    #[test]
    fn enabled_when_both_set() {
        let c = TurnstileConfig {
            site_key: Some("k".into()),
            secret_key: Some("s".into()),
        };
        assert!(c.enabled());
    }

    #[test]
    fn siteverify_json_success() {
        let j = r#"{"success":true,"error-codes":[]}"#;
        let b: SiteverifyBody = serde_json::from_str(j).unwrap();
        assert!(b.success);
    }

    #[test]
    fn siteverify_json_failure_with_codes() {
        let j = r#"{"success":false,"error-codes":["invalid-input-response"]}"#;
        let b: SiteverifyBody = serde_json::from_str(j).unwrap();
        assert!(!b.success);
        assert!(!b.error_codes.is_empty());
    }
}
