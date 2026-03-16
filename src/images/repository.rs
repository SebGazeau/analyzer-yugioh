//! Accès Postgres : table `images`.

use std::collections::HashMap;

use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("sqlx: {0}")]
    Sqlx(#[from] sqlx::Error),
}

#[derive(Debug, Clone, FromRow)]
pub struct ImageRecord {
    pub id: Uuid,
    pub original_url: String,
    pub path_original: String,
    pub path_desktop: String,
    pub path_mobile: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub mime_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub struct ImageRepository;

impl ImageRepository {
    pub async fn insert(
        pool: &sqlx::PgPool,
        original_url: &str,
        path_original: &str,
        path_desktop: &str,
        path_mobile: &str,
        width: u32,
        height: u32,
    ) -> Result<Uuid, RepositoryError> {
        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO images (id, original_url, path_original, path_desktop, path_mobile, width, height)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(id)
        .bind(original_url)
        .bind(path_original)
        .bind(path_desktop)
        .bind(path_mobile)
        .bind(width as i32)
        .bind(height as i32)
        .execute(pool)
        .await?;
        Ok(id)
    }

    /// Liste toutes les `original_url` déjà en base (pour filtrer avant import, éviter N SELECTs).
    pub async fn list_original_urls(pool: &sqlx::PgPool) -> Result<Vec<String>, RepositoryError> {
        let rows = sqlx::query_as::<_, (String,)>("SELECT original_url FROM images")
            .fetch_all(pool)
            .await?;
        Ok(rows.into_iter().map(|(u,)| u).collect())
    }

    /// Vérifie si une image avec cette `original_url` existe déjà (idempotence import YGOProDeck).
    pub async fn exists_by_original_url(
        pool: &sqlx::PgPool,
        original_url: &str,
    ) -> Result<bool, RepositoryError> {
        let row: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM images WHERE original_url = $1")
            .bind(original_url)
            .fetch_optional(pool)
            .await?;
        Ok(row.is_some())
    }

    /// Retourne les IDs d'images pour les URLs données (original_url → id). Permet de préférer nos images au lieu des URLs externes.
    pub async fn get_ids_by_original_urls(
        pool: &sqlx::PgPool,
        urls: &[String],
    ) -> Result<HashMap<String, Uuid>, RepositoryError> {
        let mut map = HashMap::new();
        for url in urls {
            let url = url.trim();
            if url.is_empty() {
                continue;
            }
            let row: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM images WHERE TRIM(original_url) = $1")
                .bind(url)
                .fetch_optional(pool)
                .await?;
            if let Some((id,)) = row {
                map.insert(url.to_string(), id);
            }
        }
        Ok(map)
    }

    pub async fn get_by_id(
        pool: &sqlx::PgPool,
        id: Uuid,
    ) -> Result<Option<ImageRecord>, RepositoryError> {
        let row = sqlx::query_as::<_, ImageRecord>(
            "SELECT id, original_url, path_original, path_desktop, path_mobile, width, height, mime_type, created_at FROM images WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;
        Ok(row)
    }

    pub async fn list(pool: &sqlx::PgPool) -> Result<Vec<ImageRecord>, RepositoryError> {
        let rows = sqlx::query_as::<_, ImageRecord>(
            "SELECT id, original_url, path_original, path_desktop, path_mobile, width, height, mime_type, created_at FROM images ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?;
        Ok(rows)
    }
}
