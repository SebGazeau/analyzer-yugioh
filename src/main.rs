//! Point d'entrée du serveur.
//!
//! Variables d'environnement :
//!   PORT               — port (défaut : 8080)
//!   CARDS_PATH         — chemin cards.json
//!   DATABASE_URL       — si défini, cache depuis Postgres
//!   STORAGE_BACKEND    — "local" (défaut) ou "gcs"
//!   LOCAL_STORAGE_PATH — ex. /storage (Docker)
//!   APP_ENV / RUST_ENV — `production` ou `prod` : exige ADMIN_SECRET et SESSION_SECRET (>= 32 octets UTF-8)
//!   ADMIN_SECRET       — protège /admin (header X-Admin-Key)
//!   SESSION_SECRET     — clé pour les cookies de session (/web ; attributs Secure/SameSite selon APP_ENV, voir session_cookies)
//!   JWT_SECRET         — secret de signature / vérification des JWT (/api)
//!   API_ISSUER_SECRET  — clé attendue dans POST /api/auth/token (défaut : même valeur que JWT_SECRET, avec warning)
//!   IMAGE_IMPORT_ALLOWED_HOST_SUFFIXES — import /images : suffixes hôtes (virgules), défaut ygoprodeck.com
//!   IMAGE_IMPORT_MAX_BYTES — plafond téléchargement import (1 KiB–100 MiB), défaut 15 MiB
//!   ENABLE_SWAGGER_UI — `1`/`true`/`yes`/`on` force Swagger ; `0`/`false` désactive. Hors prod : activé par défaut ; en prod : désactivé sauf si activé explicitement.
//!   SITE_AUTH_RATE_LIMIT_PER_MINUTE — max POST `/login` par IP / minute (défaut 30).
//!   REGISTER_RATE_LIMIT_PER_MINUTE — max POST `/register` par IP / minute (défaut 5).
//!   ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE — max POST `/admin/login` par IP / minute (défaut 15).
//!   TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY — Cloudflare Turnstile sur `/register` (optionnel si les deux absents ; voir doc Cloudflare pour clés de test).
//!   YGOPRODECK_CARDINFO_URL — optionnel : URL `cardinfo.php` (défaut API publique v7) pour `sync-cards` / `fetch_cards` (DB).
//!   FIDRAULIS_INSIGHT_TELEMETRY — télémétrie agrégée Fidraulis : absent/`0`/`off` = désactivé (404) ; `log` = logs seulement ; `1`/`on`/`persist` = écriture SQL + GET agrégat.
//!
//! Sous-commandes sans serveur HTTP :
//!   `migrate` — migrations SQL puis exit.
//!   `sync-cards` — sync cartes + sets depuis YGOProDeck (API JSON) puis exit ; pour jobs cloud / cron.
//!   `konami-pack-index` — index des packs officiels Konami (HTML → JSON dans `konami_catalog_snapshots`). `KONAMI_LOCALE` (défaut `en`).
//!   `sync-locales-ygo` — remplit `card_locales` via YGOProDeck (`CARD_LOCALES_YGO`, défaut `fr,de,it,pt`).
//!   `sync-locales-konami` — enrichit `card_locales` depuis les fiches officielles (nécessite `konami-pack-index` pour la même locale). Limites : `KONAMI_LOCALE_SYNC_MAX_PACKS`, `KONAMI_LOCALE_SYNC_MAX_DETAILS`, `KONAMI_REQUEST_DELAY_MS`.
//!   Admin : `GET /admin/reload_cache_from_db` — recharge le cache `cards` depuis Postgres (sans API), ex. après `sync-cards` si l’instance tournait déjà.

use std::path::Path;

use actix_web::cookie::Key;
use actix_web::{HttpServer, web};
use sqlx::postgres::PgPoolOptions;

use analyzer_yugioh::{
    CARDS_PATH_DEFAULT,
    auth::{api::resolve_api_token_issuer_secret, jwt::JwtSecret, turnstile::TurnstileConfig},
    cli, config, db, make_app,
    rate_limit::rate_limit_state_from_env,
    security_startup::{self, StartupSecretError},
    session_cookies::SessionCookieSettings,
    shared::{search::cache::CardCache, utils::templates::create_template},
    storage,
};

fn resolve_port() -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080)
}

fn resolve_cards_path() -> String {
    std::env::var("CARDS_PATH").unwrap_or_else(|_| CARDS_PATH_DEFAULT.to_string())
}

/// Charge le cache depuis `path`. Si le fichier est absent ou invalide,
/// démarre avec un cache vide (cartes via GET /admin/fetch_cards si ADMIN_SECRET).
fn load_cache_from_file(path: &str) -> CardCache {
    CardCache::load_from_path(Path::new(path)).unwrap_or_else(|e| {
        eprintln!(
            "[warn] cards.json introuvable ou invalide ({path}): {e} — démarrage sans cartes."
        );
        CardCache::empty()
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    if let Some(outcome) = cli::run_subcommand_if_present().await {
        return outcome;
    }

    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let port = resolve_port();
    let cards_path = resolve_cards_path();
    let database_url = std::env::var("DATABASE_URL").ok();

    let storage_data = match config::Config::from_env() {
        Ok(cfg) => match storage::from_config_async(&cfg).await {
            Ok(s) => Some(web::Data::new(s)),
            Err(e) => {
                tracing::warn!("storage: {} — routes images désactivées", e);
                None
            }
        },
        Err(e) => {
            tracing::warn!("config: {} — routes images désactivées", e);
            None
        }
    };

    let (cache_data, pool_data) = if let Some(ref url) = database_url {
        match PgPoolOptions::new().max_connections(5).connect(url).await {
            Ok(pool) => {
                if let Err(e) = db::run_migrations(&pool).await {
                    eprintln!("[warn] Migrations: {e} — poursuite sans.");
                }
                let cards = db::load_all_cards(&pool).await.unwrap_or_else(|e| {
                    eprintln!("[warn] DB load: {e} — cache vide.");
                    vec![]
                });
                let cache = CardCache::from_cards(cards);
                let pool_data = Some(web::Data::new(pool));
                (web::Data::new(cache), pool_data)
            }
            Err(e) => {
                eprintln!(
                    "[warn] DATABASE_URL invalide ou DB injoignable: {e} — fallback fichier."
                );
                (web::Data::new(load_cache_from_file(&cards_path)), None)
            }
        }
    } else {
        (web::Data::new(load_cache_from_file(&cards_path)), None)
    };

    let tera_data = web::Data::new(create_template().map_err(std::io::Error::other)?);
    let path_data = web::Data::new(cards_path);

    let app_env = security_startup::app_environment_from_env();
    let admin_secret_opt = std::env::var("ADMIN_SECRET")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let session_secret_opt = std::env::var("SESSION_SECRET")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if app_env.is_production() {
        validate_production_or_exit(admin_secret_opt.as_deref(), session_secret_opt.as_deref());
    } else {
        security_startup::log_dev_secret_warnings(
            admin_secret_opt.as_deref(),
            session_secret_opt.as_deref(),
        );
    }

    let admin_secret = admin_secret_opt;
    let session_key = session_secret_opt.map(|s| session_key_from_secret(&s));

    let jwt_secret_raw = std::env::var("JWT_SECRET").ok();
    let jwt_trimmed = jwt_secret_raw
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let jwt_secret = jwt_trimmed
        .as_ref()
        .map(|s| web::Data::new(JwtSecret(s.as_bytes().to_vec())));
    let api_issuer_env = std::env::var("API_ISSUER_SECRET").ok();
    let (api_token_issuer_secret, issuer_uses_jwt_fallback) =
        resolve_api_token_issuer_secret(api_issuer_env, jwt_trimmed.clone());
    if issuer_uses_jwt_fallback {
        tracing::warn!(
            "API_ISSUER_SECRET absent : POST /api/auth/token accepte la même clé que JWT_SECRET ; définissez API_ISSUER_SECRET pour séparer émission et signature."
        );
    }

    let enable_swagger_ui = security_startup::swagger_ui_enabled_from_env();
    if app_env.is_production() && !enable_swagger_ui {
        tracing::info!("Swagger UI désactivé (production, ENABLE_SWAGGER_UI non activé).");
    }

    let session_cookie_settings = if app_env.is_production() {
        SessionCookieSettings::for_production()
    } else {
        SessionCookieSettings::for_local_development()
    };

    let rate_limit_data = web::Data::new(rate_limit_state_from_env());
    let turnstile_data = web::Data::new(TurnstileConfig::from_env());
    if turnstile_data.enabled() {
        tracing::info!("Turnstile activé sur /register.");
    }

    tracing::info!("Écoute sur 0.0.0.0:{}", port);
    HttpServer::new(move || {
        make_app(
            cache_data.clone(),
            tera_data.clone(),
            path_data.clone(),
            pool_data.clone(),
            storage_data.clone(),
            admin_secret.clone(),
            session_key.clone(),
            session_cookie_settings,
            jwt_secret.clone(),
            api_token_issuer_secret.clone(),
            enable_swagger_ui,
            rate_limit_data.clone(),
            turnstile_data.clone(),
        )
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

fn session_key_from_secret(secret: &str) -> Key {
    let mut arr = [0u8; 64];
    let b = secret.as_bytes();
    let n = b.len().min(64);
    arr[..n].copy_from_slice(&b[..n]);
    Key::from(&arr)
}

fn validate_production_or_exit(admin: Option<&str>, session: Option<&str>) {
    if let Err(e) = security_startup::validate_production_secrets(admin, session) {
        eprintln!("[fatal] {e}");
        let code = match e {
            StartupSecretError::AdminSecretInvalid => 1,
            StartupSecretError::SessionSecretInvalid => 2,
        };
        std::process::exit(code);
    }
}
