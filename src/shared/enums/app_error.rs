use actix_web::{HttpResponse, ResponseError, http::StatusCode};

use crate::shared::search::cache::CardCacheError;
use crate::shared::structs::card_search_result::CardSearchResultError;
use crate::shared::structs::deck::DeckError;
use crate::shared::structs::search_query::SearchQueryError;

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum AppError {
    #[error(transparent)]
    Deck(#[from] DeckError),
    #[error(transparent)]
    SearchQuery(#[from] SearchQueryError),
    #[error(transparent)]
    CardCache(#[from] CardCacheError),
    #[error(transparent)]
    CardSearchResult(#[from] CardSearchResultError),
}

impl ResponseError for AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            AppError::Deck(_) | AppError::SearchQuery(_) => StatusCode::BAD_REQUEST,
            AppError::CardCache(_) | AppError::CardSearchResult(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).body(self.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error() {
        let error = AppError::Deck(DeckError::TooFewCards {
            expected_min: 40,
            actual: 39,
        });
        assert_eq!(error.to_string(), "expected at least 40 cards, got 39");
    }
}
