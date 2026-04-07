//! Sous-commande `migrate` : applique les migrations SQL embarquées puis quitte.
//!
//! Usage : `DATABASE_URL=… ./analyzer-yugioh migrate` ou `cargo run -- migrate`.

use sqlx::postgres::PgPoolOptions;

use crate::db;

/// Code de sortie non nul si échec (CI / job Cloud Run avant trafic).
pub async fn run() -> std::io::Result<()> {
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
