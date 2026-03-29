//! Migrations SQLx.

use sqlx::PgPool;

use super::error::DbError;

/// Applique les migrations (dossier `migrations/` à la racine du projet).
pub async fn run_migrations(pool: &PgPool) -> Result<(), DbError> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}
