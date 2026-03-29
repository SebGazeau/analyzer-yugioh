//! Erreurs communes SQL / migrations / validation cache.

use crate::shared::structs::card_search_result::CardSearchResultError;

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("sqlx: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("migrate: {0}")]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error("invalid card at index {index}: {source}")]
    InvalidCard {
        index: usize,
        #[source]
        source: CardSearchResultError,
    },
}
