//! Point d'entrée du serveur.
//!
//! Variables d'environnement :
//!   PORT               — port (défaut : 8080)
//!   CARDS_PATH         — chemin cards.json
//!   DATABASE_URL       — si défini, cache depuis Postgres
//!   STORAGE_BACKEND    — "local" (défaut) ou "gcs"
//!   LOCAL_STORAGE_PATH — ex. /storage (Docker)
//!   ADMIN_SECRET       — protège /admin (header X-Admin-Key)
//!   SESSION_SECRET     — clé pour les cookies de session (/web)
//!   JWT_SECRET         — secret JWT + clé pour POST /api/auth/token

use std::path::Path;

use actix_web::cookie::Key;
use actix_web::{HttpServer, web};
use sqlx::postgres::PgPoolOptions;

use analyzer_yugioh::{
    auth::jwt::JwtSecret,
    config, db,
    handlers::CARDS_PATH_DEFAULT,
    make_app,
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
                    eprintln!("[warn] Migrations: {} — poursuite sans.", e);
                }
                let cards = db::load_all_cards(&pool).await.unwrap_or_else(|e| {
                    eprintln!("[warn] DB load: {} — cache vide.", e);
                    vec![]
                });
                let cache = CardCache::from_cards(cards);
                let pool_data = Some(web::Data::new(pool));
                (web::Data::new(cache), pool_data)
            }
            Err(e) => {
                eprintln!(
                    "[warn] DATABASE_URL invalide ou DB injoignable: {} — fallback fichier.",
                    e
                );
                (web::Data::new(load_cache_from_file(&cards_path)), None)
            }
        }
    } else {
        (web::Data::new(load_cache_from_file(&cards_path)), None)
    };

    let tera_data = web::Data::new(create_template().map_err(std::io::Error::other)?);
    let path_data = web::Data::new(cards_path);
    let admin_secret = std::env::var("ADMIN_SECRET").ok();

    let session_key = std::env::var("SESSION_SECRET").ok().map(|s| {
        let mut arr = [0u8; 64];
        let b = s.as_bytes();
        let n = b.len().min(64);
        arr[..n].copy_from_slice(&b[..n]);
        Key::from(&arr)
    });

    let jwt_secret = std::env::var("JWT_SECRET")
        .ok()
        .map(|s| web::Data::new(JwtSecret(s.into_bytes())));
    let api_key = std::env::var("JWT_SECRET").ok();

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
            jwt_secret.clone(),
            api_key.clone(),
        )
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
