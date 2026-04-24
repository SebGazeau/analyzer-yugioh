//! Persistance `decks` / `deck_entries` (étape 3.2).

use sqlx::PgPool;
use uuid::Uuid;

use crate::db::DbError;

#[derive(Debug, serde::Serialize)]
pub struct DeckListItem {
    pub id: i32,
    pub name: String,
    pub is_public: bool,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_card_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_image_url: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct DeckEntryItem {
    pub card_id: i64,
    pub name: String,
    pub zone: String,
    pub quantity: i16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engine: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,
}

/// Données pour insérer une entrée de deck (création / mise à jour).
pub struct DeckEntryInsert {
    pub card_id: i64,
    pub zone: String,
    pub quantity: i16,
    pub engine: Option<String>,
    pub categories: Vec<String>,
}

/// Compte le nombre de decks d'un utilisateur site.
pub async fn count_decks_for_site_user(pool: &PgPool, site_user_id: Uuid) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*)::bigint FROM decks WHERE site_user_id = $1")
        .bind(site_user_id)
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}

/// Liste les decks du compte connecté (`site_user_id`).
pub async fn list_decks_for_site_user(
    pool: &PgPool,
    site_user_id: uuid::Uuid,
) -> Result<Vec<DeckListItem>, DbError> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id: i32,
        name: String,
        is_public: bool,
        created_at: chrono::DateTime<chrono::Utc>,
        cover_card_name: Option<String>,
        cover_image_url: Option<String>,
    }
    let rows: Vec<Row> = sqlx::query_as(
        "SELECT id, name, is_public, created_at, cover_card_name, cover_image_url FROM decks WHERE site_user_id = $1 ORDER BY created_at DESC",
    )
    .bind(site_user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| DeckListItem {
            id: r.id,
            name: r.name,
            is_public: r.is_public,
            created_at: r.created_at.to_rfc3339(),
            cover_card_name: r.cover_card_name.filter(|s| !s.is_empty()),
            cover_image_url: r.cover_image_url.filter(|s| !s.is_empty()),
        })
        .collect())
}

/// Retourne un deck par id avec ses entrées et la couverture (réservé au propriétaire `site_user_id`).
pub async fn get_deck_with_entries(
    pool: &PgPool,
    deck_id: i32,
    site_user_id: uuid::Uuid,
) -> Result<
    Option<(
        String,
        bool,
        Option<String>,
        Option<String>,
        Vec<DeckEntryItem>,
    )>,
    DbError,
> {
    #[derive(sqlx::FromRow)]
    struct DeckRow {
        name: String,
        is_public: bool,
        cover_card_name: Option<String>,
        cover_image_url: Option<String>,
    }
    let deck: Option<DeckRow> = sqlx::query_as(
        "SELECT name, is_public, cover_card_name, cover_image_url FROM decks WHERE id = $1 AND site_user_id = $2",
    )
    .bind(deck_id)
    .bind(site_user_id)
    .fetch_optional(pool)
    .await?;
    let deck = match deck {
        Some(d) => d,
        None => return Ok(None),
    };
    let cover_card_name = deck.cover_card_name.filter(|s| !s.is_empty());
    let cover_image_url = deck.cover_image_url.filter(|s| !s.is_empty());
    #[derive(sqlx::FromRow)]
    struct EntryRow {
        card_id: i64,
        name: String,
        zone: String,
        quantity: i16,
        engine: Option<String>,
        categories: Option<sqlx::types::Json<Vec<String>>>,
    }
    let entries: Vec<EntryRow> = sqlx::query_as(
        r#"
        SELECT e.card_id, c.name, e.zone::text AS zone, e.quantity, e.engine, e.categories
        FROM deck_entries e
        JOIN cards c ON c.id = e.card_id
        WHERE e.deck_id = $1
        ORDER BY e.zone, e.card_id
        "#,
    )
    .bind(deck_id)
    .fetch_all(pool)
    .await?;
    let items = entries
        .into_iter()
        .map(|r| DeckEntryItem {
            card_id: r.card_id,
            name: r.name,
            zone: r.zone,
            quantity: r.quantity,
            engine: r.engine.filter(|s| !s.is_empty()),
            categories: r.categories.map(|j| j.0),
        })
        .collect();
    Ok(Some((
        deck.name,
        deck.is_public,
        cover_card_name,
        cover_image_url,
        items,
    )))
}

/// Crée un deck et ses entrées pour un compte site.
pub async fn create_deck(
    pool: &PgPool,
    name: &str,
    site_user_id: uuid::Uuid,
    entries: &[DeckEntryInsert],
    cover_card_name: Option<&str>,
    cover_image_url: Option<&str>,
) -> Result<i32, DbError> {
    let row: (i32,) = sqlx::query_as(
        "INSERT INTO decks (name, user_id, site_user_id, is_public, cover_card_name, cover_image_url) VALUES ($1, NULL, $2, false, $3, $4) RETURNING id",
    )
    .bind(name)
    .bind(site_user_id)
    .bind(cover_card_name)
    .bind(cover_image_url)
    .fetch_one(pool)
    .await?;
    let deck_id = row.0;
    for e in entries {
        let cat_json =
            serde_json::to_value(&e.categories).unwrap_or(serde_json::Value::Array(vec![]));
        sqlx::query(
            "INSERT INTO deck_entries (deck_id, card_id, zone, quantity, engine, categories) VALUES ($1, $2, $3::deck_zone, $4, $5, $6)",
        )
        .bind(deck_id)
        .bind(e.card_id)
        .bind(&e.zone)
        .bind(e.quantity)
        .bind(e.engine.as_deref().unwrap_or(""))
        .bind(cat_json)
        .execute(pool)
        .await?;
    }
    Ok(deck_id)
}

/// Met à jour le nom, la couverture et remplace toutes les entrées du deck (propriétaire uniquement).
pub async fn update_deck(
    pool: &PgPool,
    deck_id: i32,
    site_user_id: uuid::Uuid,
    name: &str,
    entries: &[DeckEntryInsert],
    cover_card_name: Option<&str>,
    cover_image_url: Option<&str>,
) -> Result<bool, DbError> {
    let res = sqlx::query(
        "UPDATE decks SET name = $1, cover_card_name = $2, cover_image_url = $3, updated_at = NOW() WHERE id = $4 AND site_user_id = $5",
    )
    .bind(name)
    .bind(cover_card_name)
    .bind(cover_image_url)
    .bind(deck_id)
    .bind(site_user_id)
    .execute(pool)
    .await?;
    if res.rows_affected() == 0 {
        return Ok(false);
    }
    sqlx::query("DELETE FROM deck_entries WHERE deck_id = $1")
        .bind(deck_id)
        .execute(pool)
        .await?;
    for e in entries {
        let cat_json =
            serde_json::to_value(&e.categories).unwrap_or(serde_json::Value::Array(vec![]));
        sqlx::query(
            "INSERT INTO deck_entries (deck_id, card_id, zone, quantity, engine, categories) VALUES ($1, $2, $3::deck_zone, $4, $5, $6)",
        )
        .bind(deck_id)
        .bind(e.card_id)
        .bind(&e.zone)
        .bind(e.quantity)
        .bind(e.engine.as_deref().unwrap_or(""))
        .bind(cat_json)
        .execute(pool)
        .await?;
    }
    Ok(true)
}

/// Supprime un deck (CASCADE supprime les entrées) si le propriétaire correspond.
pub async fn delete_deck(
    pool: &PgPool,
    deck_id: i32,
    site_user_id: uuid::Uuid,
) -> Result<bool, DbError> {
    let res = sqlx::query("DELETE FROM decks WHERE id = $1 AND site_user_id = $2")
        .bind(deck_id)
        .bind(site_user_id)
        .execute(pool)
        .await?;
    Ok(res.rows_affected() > 0)
}
