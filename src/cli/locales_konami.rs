//! Sous-commande `sync-locales-konami` : enrichit `card_locales` depuis les fiches Konami.

use std::time::Duration;

use sqlx::postgres::PgPoolOptions;

use crate::{db, konami_catalog};

pub async fn run() -> std::io::Result<()> {
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
