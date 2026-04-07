//! Validation des secrets au démarrage : en `APP_ENV=production`, refuse un déploiement
//! sans `ADMIN_SECRET` et `SESSION_SECRET` suffisamment longs.
//!
//! **Swagger UI** : désactivé en production par défaut ; voir [`swagger_ui_enabled`].

mod env;
mod secrets;

pub use env::{
    app_environment_from_env, parse_app_env_raw, swagger_ui_enabled, swagger_ui_enabled_from_env,
};
pub use secrets::{
    MIN_SECRET_UTF8_BYTES, StartupSecretError, log_dev_secret_warnings, validate_production_secrets,
};

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
