//! Validation des secrets au démarrage : en `APP_ENV=production`, refuse un déploiement
//! sans `ADMIN_SECRET` et `SESSION_SECRET` suffisamment longs.
//!
//! **Swagger UI** : désactivé en production par défaut ; voir [`swagger_ui_enabled`].

use std::fmt;

/// Longueur minimale (en octets UTF-8 après trim) pour les secrets en production.
pub const MIN_SECRET_UTF8_BYTES: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppEnvironment {
    Development,
    Production,
}

impl AppEnvironment {
    pub fn is_production(self) -> bool {
        matches!(self, Self::Production)
    }
}

/// Interprète `APP_ENV` ou à défaut `RUST_ENV` (`production` / `prod` → prod).
pub fn app_environment_from_env() -> AppEnvironment {
    let raw = std::env::var("APP_ENV")
        .ok()
        .or_else(|| std::env::var("RUST_ENV").ok());
    parse_app_env_raw(raw.as_deref())
}

/// Parse explicite (testable sans variable d’environnement).
pub fn parse_app_env_raw(raw: Option<&str>) -> AppEnvironment {
    let Some(s) = raw.map(str::trim).filter(|s| !s.is_empty()) else {
        return AppEnvironment::Development;
    };
    match s.to_lowercase().as_str() {
        "production" | "prod" => AppEnvironment::Production,
        _ => AppEnvironment::Development,
    }
}

/// Active Swagger UI (`/swagger-ui/`, `/api-docs/openapi.json`).
///
/// - Variable **`ENABLE_SWAGGER_UI`** : `1`, `true`, `yes`, `on` → activé ; `0`, `false`, `no`, `off` ou toute autre valeur non vide → désactivé.
/// - Si la variable est **absente** ou vide après trim : **activé** hors production, **désactivé** en production (`APP_ENV` / `RUST_ENV`).
pub fn swagger_ui_enabled(app_env: AppEnvironment, enable_swagger_ui_var: Option<&str>) -> bool {
    let explicit = enable_swagger_ui_var
        .map(str::trim)
        .filter(|s| !s.is_empty());
    match explicit {
        None => !app_env.is_production(),
        Some(t) => match t.to_lowercase().as_str() {
            "1" | "true" | "yes" | "on" => true,
            _ => false,
        },
    }
}

/// Lit [`swagger_ui_enabled`] depuis l’environnement courant.
pub fn swagger_ui_enabled_from_env() -> bool {
    let app_env = app_environment_from_env();
    let raw = std::env::var("ENABLE_SWAGGER_UI").ok();
    swagger_ui_enabled(app_env, raw.as_deref())
}

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
                "ADMIN_SECRET requis en production (APP_ENV=production), non vide et >= {} octets UTF-8 après trim",
                MIN_SECRET_UTF8_BYTES
            ),
            Self::SessionSecretInvalid => write!(
                f,
                "SESSION_SECRET requis en production (APP_ENV=production), non vide et >= {} octets UTF-8 après trim",
                MIN_SECRET_UTF8_BYTES
            ),
        }
    }
}

impl std::error::Error for StartupSecretError {}

fn secret_ok_for_production(secret: Option<&str>) -> bool {
    let Some(s) = secret.map(str::trim).filter(|s| !s.is_empty()) else {
        return false;
    };
    s.as_bytes().len() >= MIN_SECRET_UTF8_BYTES
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_app_env_none_empty_dev() {
        assert_eq!(parse_app_env_raw(None), AppEnvironment::Development);
        assert_eq!(parse_app_env_raw(Some("")), AppEnvironment::Development);
        assert_eq!(parse_app_env_raw(Some("   ")), AppEnvironment::Development);
    }

    #[test]
    fn parse_app_env_production() {
        assert_eq!(
            parse_app_env_raw(Some("production")),
            AppEnvironment::Production
        );
        assert_eq!(parse_app_env_raw(Some("PROD")), AppEnvironment::Production);
        assert_eq!(
            parse_app_env_raw(Some("  prod  ")),
            AppEnvironment::Production
        );
    }

    #[test]
    fn parse_app_env_other_is_dev() {
        assert_eq!(parse_app_env_raw(Some("dev")), AppEnvironment::Development);
        assert_eq!(
            parse_app_env_raw(Some("staging")),
            AppEnvironment::Development
        );
    }

    fn secret_32() -> String {
        "a".repeat(MIN_SECRET_UTF8_BYTES)
    }

    #[test]
    fn validate_production_both_ok() {
        let a = secret_32();
        let s = secret_32();
        assert!(validate_production_secrets(Some(&a), Some(&s)).is_ok());
    }

    #[test]
    fn validate_production_admin_missing() {
        let s = secret_32();
        assert_eq!(
            validate_production_secrets(None, Some(&s)),
            Err(StartupSecretError::AdminSecretInvalid)
        );
        assert_eq!(
            validate_production_secrets(Some(""), Some(&s)),
            Err(StartupSecretError::AdminSecretInvalid)
        );
    }

    #[test]
    fn validate_production_session_missing() {
        let a = secret_32();
        assert_eq!(
            validate_production_secrets(Some(&a), None),
            Err(StartupSecretError::SessionSecretInvalid)
        );
    }

    #[test]
    fn validate_production_admin_too_short() {
        let a = "x".repeat(MIN_SECRET_UTF8_BYTES - 1);
        let s = secret_32();
        assert_eq!(
            validate_production_secrets(Some(&a), Some(&s)),
            Err(StartupSecretError::AdminSecretInvalid)
        );
    }

    #[test]
    fn validate_production_session_too_short() {
        let a = secret_32();
        let s = "y".repeat(MIN_SECRET_UTF8_BYTES - 1);
        assert_eq!(
            validate_production_secrets(Some(&a), Some(&s)),
            Err(StartupSecretError::SessionSecretInvalid)
        );
    }

    #[test]
    fn validate_production_trimmed_length_counts() {
        let inner = "a".repeat(MIN_SECRET_UTF8_BYTES);
        let padded = format!("  {inner}  ");
        let s = secret_32();
        assert!(validate_production_secrets(Some(&padded), Some(&s)).is_ok());
    }

    #[test]
    fn swagger_default_dev_on() {
        assert!(swagger_ui_enabled(AppEnvironment::Development, None));
    }

    #[test]
    fn swagger_default_prod_off() {
        assert!(!swagger_ui_enabled(AppEnvironment::Production, None));
    }

    #[test]
    fn swagger_prod_explicit_on() {
        assert!(swagger_ui_enabled(AppEnvironment::Production, Some("true")));
        assert!(swagger_ui_enabled(AppEnvironment::Production, Some("1")));
    }

    #[test]
    fn swagger_dev_explicit_off() {
        assert!(!swagger_ui_enabled(AppEnvironment::Development, Some("0")));
        assert!(!swagger_ui_enabled(
            AppEnvironment::Development,
            Some("false")
        ));
    }

    #[test]
    fn swagger_empty_var_uses_env_default() {
        assert!(swagger_ui_enabled(AppEnvironment::Development, Some("   ")));
        assert!(!swagger_ui_enabled(AppEnvironment::Production, Some("   ")));
    }
}
