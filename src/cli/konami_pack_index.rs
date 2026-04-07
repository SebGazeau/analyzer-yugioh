//! Sous-commande `konami-pack-index` : index des packs Konami → `konami_catalog_snapshots`.
//!
//! `KONAMI_LOCALE` (défaut `en`).

use sqlx::postgres::PgPoolOptions;

use crate::{db, konami_catalog};

pub async fn run() -> std::io::Result<()> {
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
