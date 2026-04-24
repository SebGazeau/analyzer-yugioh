//! Accès données pour l'espace `Mon compte`.

use uuid::Uuid;

use crate::auth::user_db;
use crate::db::DbError;
use crate::modules::decks::count_decks_for_site_user;

#[derive(Debug, Clone)]
pub struct AccountProfile {
    pub user_id: Uuid,
    pub pseudo: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub deck_count: i64,
}

pub async fn load_profile(
    pool: &sqlx::PgPool,
    user_id: Uuid,
) -> Result<Option<AccountProfile>, DbError> {
    let user = match user_db::get_user_by_id(pool, user_id).await? {
        Some(u) => u,
        None => return Ok(None),
    };
    let deck_count = count_decks_for_site_user(pool, user.id).await?;
    Ok(Some(AccountProfile {
        user_id: user.id,
        pseudo: user.pseudo,
        created_at: user.created_at,
        deck_count,
    }))
}
