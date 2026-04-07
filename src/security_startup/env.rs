//! Environnement d’exécution (`APP_ENV` / `RUST_ENV`) et Swagger UI.

/// Interprète `APP_ENV` ou à défaut `RUST_ENV` (`production` / `prod` → prod).
pub fn app_environment_from_env() -> super::AppEnvironment {
    let raw = std::env::var("APP_ENV")
        .ok()
        .or_else(|| std::env::var("RUST_ENV").ok());
    parse_app_env_raw(raw.as_deref())
}

/// Parse explicite (testable sans variable d’environnement).
pub fn parse_app_env_raw(raw: Option<&str>) -> super::AppEnvironment {
    let Some(s) = raw.map(str::trim).filter(|s| !s.is_empty()) else {
        return super::AppEnvironment::Development;
    };
    match s.to_lowercase().as_str() {
        "production" | "prod" => super::AppEnvironment::Production,
        _ => super::AppEnvironment::Development,
    }
}

/// Active Swagger UI (`/swagger-ui/`, `/api-docs/openapi.json`).
///
/// - Variable **`ENABLE_SWAGGER_UI`** : `1`, `true`, `yes`, `on` → activé ; `0`, `false`, `no`, `off` ou toute autre valeur non vide → désactivé.
/// - Si la variable est **absente** ou vide après trim : **activé** hors production, **désactivé** en production (`APP_ENV` / `RUST_ENV`).
pub fn swagger_ui_enabled(
    app_env: super::AppEnvironment,
    enable_swagger_ui_var: Option<&str>,
) -> bool {
    let explicit = enable_swagger_ui_var
        .map(str::trim)
        .filter(|s| !s.is_empty());
    match explicit {
        None => !app_env.is_production(),
        Some(t) => matches!(t.to_lowercase().as_str(), "1" | "true" | "yes" | "on"),
    }
}

/// Lit [`swagger_ui_enabled`] depuis l’environnement courant.
pub fn swagger_ui_enabled_from_env() -> bool {
    let app_env = app_environment_from_env();
    let raw = std::env::var("ENABLE_SWAGGER_UI").ok();
    swagger_ui_enabled(app_env, raw.as_deref())
}
