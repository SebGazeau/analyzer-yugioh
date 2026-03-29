//! Snapshots catalogue Konami (`konami_catalog_snapshots`).

use sqlx::PgPool;
use sqlx::types::Json;

use super::error::DbError;

/// Snapshot parsé du site officiel Konami (`konami_catalog_snapshots`).
pub async fn upsert_konami_catalog_snapshot(
    pool: &PgPool,
    snapshot_key: &str,
    locale: &str,
    kind: &str,
    source_url: &str,
    payload: &serde_json::Value,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO konami_catalog_snapshots (snapshot_key, locale, kind, source_url, payload, fetched_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
        ON CONFLICT (snapshot_key) DO UPDATE SET
            locale = EXCLUDED.locale,
            kind = EXCLUDED.kind,
            source_url = EXCLUDED.source_url,
            payload = EXCLUDED.payload,
            fetched_at = NOW()
        "#,
    )
    .bind(snapshot_key)
    .bind(locale)
    .bind(kind)
    .bind(source_url)
    .bind(Json(payload.clone()))
    .execute(pool)
    .await?;
    Ok(())
}

/// Payload JSON d’un snapshot Konami (`konami_catalog_snapshots`).
pub async fn get_konami_catalog_snapshot_json(
    pool: &PgPool,
    snapshot_key: &str,
) -> Result<Option<serde_json::Value>, DbError> {
    let row: Option<(Json<serde_json::Value>,)> =
        sqlx::query_as("SELECT payload FROM konami_catalog_snapshots WHERE snapshot_key = $1")
            .bind(snapshot_key)
            .fetch_optional(pool)
            .await?;
    Ok(row.map(|(j,)| j.0))
}
