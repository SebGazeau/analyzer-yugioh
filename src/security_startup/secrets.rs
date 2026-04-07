//! Validation des secrets admin / session au démarrage.

use std::fmt;

/// Longueur minimale (en octets UTF-8 après trim) pour les secrets en production.
pub const MIN_SECRET_UTF8_BYTES: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupSecretError {
    AdminSecretInvalid,
    SessionSecretInvalid,
}

impl fmt::Display for StartupSecretError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AdminSecretInvalid => write!(
                f,
                "ADMIN_SECRET requis en production (APP_ENV=production), non vide et >= {MIN_SECRET_UTF8_BYTES} octets UTF-8 après trim",
            ),
            Self::SessionSecretInvalid => write!(
                f,
                "SESSION_SECRET requis en production (APP_ENV=production), non vide et >= {MIN_SECRET_UTF8_BYTES} octets UTF-8 après trim",
            ),
        }
    }
}

impl std::error::Error for StartupSecretError {}

fn secret_ok_for_production(secret: Option<&str>) -> bool {
    let Some(s) = secret.map(str::trim).filter(|s| !s.is_empty()) else {
        return false;
    };
    s.len() >= MIN_SECRET_UTF8_BYTES
}

/// Échoue si l’environnement est production et qu’un secret manque ou est trop court.
pub fn validate_production_secrets(
    admin_secret: Option<&str>,
    session_secret: Option<&str>,
) -> Result<(), StartupSecretError> {
    if !secret_ok_for_production(admin_secret) {
        return Err(StartupSecretError::AdminSecretInvalid);
    }
    if !secret_ok_for_production(session_secret) {
        return Err(StartupSecretError::SessionSecretInvalid);
    }
    Ok(())
}

/// Avertissements en développement (admin ouvert, clé session prévisible, secrets courts).
pub fn log_dev_secret_warnings(admin_secret: Option<&str>, session_secret: Option<&str>) {
    let admin_ok = secret_ok_for_production(admin_secret);
    let admin_present = admin_secret
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .is_some();

    if !admin_present {
        tracing::warn!(
            "ADMIN_SECRET absent : les routes /admin sont accessibles sans clé (développement uniquement)."
        );
    } else if !admin_ok {
        tracing::warn!(
            "ADMIN_SECRET trop court (< {} octets) : utilisez au moins {} caractères en production.",
            MIN_SECRET_UTF8_BYTES,
            MIN_SECRET_UTF8_BYTES
        );
    }

    let session_present = session_secret
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .is_some();
    let session_ok = secret_ok_for_production(session_secret);

    if !session_present {
        tracing::warn!(
            "SESSION_SECRET absent : clé de cookie de session dérivée de zéros (développement uniquement)."
        );
    } else if !session_ok {
        tracing::warn!(
            "SESSION_SECRET trop court (< {} octets) : risque de clé faible ; prévoyez >= {} en production.",
            MIN_SECRET_UTF8_BYTES,
            MIN_SECRET_UTF8_BYTES
        );
    }
}
