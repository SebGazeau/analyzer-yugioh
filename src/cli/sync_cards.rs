//! Sous-commande `sync-cards` : synchronise `cards` + `card_sets` depuis l’API YGOProDeck.

use sqlx::postgres::PgPoolOptions;

use crate::{cards_sync, db};

/// Optionnel : `YGOPRODECK_CARDINFO_URL` pour surcharger l’URL.
pub async fn run() -> std::io::Result<()> {
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

    let s = cards_sync::sync_from_ygoprodeck(&pool).await.map_err(|e| {
        eprintln!("[fatal] sync-cards: {e}");
        std::io::Error::from(e)
    })?;
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
