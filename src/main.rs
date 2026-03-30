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
//!   SITE_AUTH_RATE_LIMIT_PER_MINUTE — max POST `/login`, `/register` par IP / minute (défaut 30).
//!   ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE — max POST `/admin/login` par IP / minute (défaut 15).
//!   YGOPRODECK_CARDINFO_URL — optionnel : URL `cardinfo.php` (défaut API publique v7) pour `sync-cards` / `fetch_cards` (DB).
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
    auth::{api::resolve_api_token_issuer_secret, jwt::JwtSecret},
    card_locales_sync, cards_sync, config, db, konami_catalog, make_app,
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
    if std::env::args().nth(1).as_deref() == Some("migrate") {
        return run_migrate_only().await;
    }
    if std::env::args().nth(1).as_deref() == Some("sync-cards") {
        return run_sync_cards_only().await;
    }
    if std::env::args().nth(1).as_deref() == Some("konami-pack-index") {
        return run_konami_pack_index_only().await;
    }
    if std::env::args().nth(1).as_deref() == Some("sync-locales-ygo") {
        return run_sync_locales_ygo_only().await;
    }
    if std::env::args().nth(1).as_deref() == Some("sync-locales-konami") {
        return run_sync_locales_konami_only().await;
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

/// Applique uniquement les migrations SQL embarquées (`sqlx::migrate!`), puis quitte.
/// Usage : `DATABASE_URL=… ./analyzer-yugioh migrate` ou `cargo run -- migrate`.
/// Code de sortie non nul si échec (CI / job Cloud Run avant trafic).
async fn run_migrate_only() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let url = std::env::var("DATABASE_URL").map_err(|_| {
        eprintln!("[fatal] DATABASE_URL requis pour la sous-commande migrate.");
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "DATABASE_URL")
    })?;

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| {
            eprintln!("[fatal] Connexion Postgres : {e}");
            std::io::Error::other(e)
        })?;

    db::run_migrations(&pool).await.map_err(|e| {
        eprintln!("[fatal] Migrations : {e}");
        std::io::Error::other(e.to_string())
    })?;

    tracing::info!("Migrations appliquées avec succès.");
    Ok(())
}

/// Synchronise `cards` + `card_sets` depuis l’API JSON YGOProDeck (retries HTTP), puis quitte.
/// Usage : `DATABASE_URL=… ./analyzer-yugioh sync-cards` (même image Docker que l’app).
/// Optionnel : `YGOPRODECK_CARDINFO_URL` pour surcharger l’URL.
async fn run_sync_cards_only() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let url = std::env::var("DATABASE_URL").map_err(|_| {
        eprintln!("[fatal] DATABASE_URL requis pour sync-cards.");
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "DATABASE_URL")
    })?;

    let pool = PgPoolOptions::new()
        .max_connections(3)
        .connect(&url)
        .await
        .map_err(|e| {
            eprintln!("[fatal] Connexion Postgres : {e}");
            std::io::Error::other(e)
        })?;

    if let Err(e) = db::run_migrations(&pool).await {
        tracing::warn!("Migrations (sync-cards): {} — poursuite.", e);
    }

    match cards_sync::sync_from_ygoprodeck(&pool).await {
        Ok(s) => {
            tracing::info!(
                "sync-cards OK — cartes: {} (upserts {}), lignes sets: {} (upserts {})",
                s.card_rows,
                s.cards_affected,
                s.set_rows,
                s.sets_affected
            );
            eprintln!(
                "Note: si l’app HTTP tourne déjà, rechargez le cache : GET /admin/reload_cache_from_db (clé admin) ou redémarrage."
            );
            Ok(())
        }
        Err(e) => {
            eprintln!("[fatal] sync-cards: {e}");
            Err(std::io::Error::other(e.to_string()))
        }
    }
}

/// Index des packs sur le site Konami → table `konami_catalog_snapshots`.
async fn run_konami_pack_index_only() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let url = std::env::var("DATABASE_URL").map_err(|_| {
        eprintln!("[fatal] DATABASE_URL requis pour konami-pack-index.");
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "DATABASE_URL")
    })?;

    let locale = std::env::var("KONAMI_LOCALE").unwrap_or_else(|_| "en".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .map_err(|e| {
            eprintln!("[fatal] Connexion Postgres : {e}");
            std::io::Error::other(e)
        })?;

    if let Err(e) = db::run_migrations(&pool).await {
        tracing::warn!("Migrations (konami-pack-index): {} — poursuite.", e);
    }

    match konami_catalog::sync_pack_index(&pool, locale.trim()).await {
        Ok(n) => {
            tracing::info!("konami-pack-index OK — {n} pack(s)");
            Ok(())
        }
        Err(e) => {
            eprintln!("[fatal] konami-pack-index: {e}");
            Err(std::io::Error::other(e.to_string()))
        }
    }
}

/// `card_locales` depuis l’API YGOProDeck par langue.
async fn run_sync_locales_ygo_only() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let url = std::env::var("DATABASE_URL").map_err(|_| {
        eprintln!("[fatal] DATABASE_URL requis pour sync-locales-ygo.");
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "DATABASE_URL")
    })?;

    let raw = std::env::var("CARD_LOCALES_YGO").unwrap_or_else(|_| "fr,de,it,pt".to_string());
    let locales: Vec<String> = raw
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if locales.is_empty() {
        eprintln!("[fatal] CARD_LOCALES_YGO ne contient aucune locale.");
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "CARD_LOCALES_YGO",
        ));
    }

    let pool = PgPoolOptions::new()
        .max_connections(3)
        .connect(&url)
        .await
        .map_err(|e| {
            eprintln!("[fatal] Connexion Postgres : {e}");
            std::io::Error::other(e)
        })?;

    if let Err(e) = db::run_migrations(&pool).await {
        tracing::warn!("Migrations (sync-locales-ygo): {} — poursuite.", e);
    }

    match card_locales_sync::sync_ygoprodeck_locales(&pool, &locales).await {
        Ok(s) => {
            tracing::info!(
                ?s.locales_processed,
                ?s.rows_filtered_per_locale,
                total_upserts = s.total_upserts,
                "sync-locales-ygo OK"
            );
            eprintln!(
                "Note: `card_locales` est lu à la volée pour GET /search?locale=… (reload cache inutile pour les seules traductions). Après un sync-cards avec l’app déjà up : GET /admin/reload_cache_from_db."
            );
            Ok(())
        }
        Err(e) => {
            eprintln!("[fatal] sync-locales-ygo: {e}");
            Err(std::io::Error::other(e.to_string()))
        }
    }
}

/// `card_locales` depuis les pages Konami (après `konami-pack-index` pour `KONAMI_LOCALE`).
async fn run_sync_locales_konami_only() -> std::io::Result<()> {
    use std::time::Duration;

    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let url = std::env::var("DATABASE_URL").map_err(|_| {
        eprintln!("[fatal] DATABASE_URL requis pour sync-locales-konami.");
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "DATABASE_URL")
    })?;

    let locale = std::env::var("KONAMI_LOCALE").unwrap_or_else(|_| "en".to_string());
    let max_packs = std::env::var("KONAMI_LOCALE_SYNC_MAX_PACKS")
        .ok()
        .and_then(|s| s.parse().ok());
    let max_details = std::env::var("KONAMI_LOCALE_SYNC_MAX_DETAILS")
        .ok()
        .and_then(|s| s.parse().ok());
    let delay_ms: u64 = std::env::var("KONAMI_REQUEST_DELAY_MS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(250);

    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .map_err(|e| {
            eprintln!("[fatal] Connexion Postgres : {e}");
            std::io::Error::other(e)
        })?;

    if let Err(e) = db::run_migrations(&pool).await {
        tracing::warn!("Migrations (sync-locales-konami): {} — poursuite.", e);
    }

    match konami_catalog::sync_pack_card_locales(
        &pool,
        locale.trim(),
        max_packs,
        max_details,
        Duration::from_millis(delay_ms),
    )
    .await
    {
        Ok(s) => {
            tracing::info!(
                packs = s.packs_processed,
                listing_rows = s.listing_rows_seen,
                details = s.detail_fetches,
                upserts = s.rows_upserted,
                skip_no_pc = s.skipped_no_passcode,
                skip_unknown = s.skipped_unknown_card_id,
                "sync-locales-konami OK"
            );
            eprintln!(
                "Note: `card_locales` sert pour /search?locale=… sans reload. Après sync-cards avec l’app déjà up : GET /admin/reload_cache_from_db."
            );
            Ok(())
        }
        Err(e) => {
            eprintln!("[fatal] sync-locales-konami: {e}");
            Err(std::io::Error::other(e.to_string()))
        }
    }
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
