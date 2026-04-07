//! Sous-commande `sync-locales-ygo` : remplit `card_locales` via YGOProDeck (`CARD_LOCALES_YGO`).

use sqlx::postgres::PgPoolOptions;

use crate::{card_locales_sync, db};

pub async fn run() -> std::io::Result<()> {
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
