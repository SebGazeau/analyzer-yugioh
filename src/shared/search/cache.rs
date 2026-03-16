//! Cache de cartes en mémoire pour la recherche.
//! Chargé depuis un fichier JSON (format API YGOProDeck : `{"data": [...]}`),
//! invalidable après `/fetch_cards`.

use std::sync::RwLock;
use std::{path::Path, sync::Arc};

use crate::shared::structs::card_search_result::{
    CardSearchResult, CardSearchResultError, RawCardSearchResult,
};

/// Réponse JSON de l’API YGOProDeck : tableau de cartes dans la clé `"data"`.
#[derive(serde::Deserialize)]
struct CardsApiResponse {
    data: Vec<RawCardSearchResult>,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum CardCacheError {
    #[error("io: {0}")]
    Io(String),
    #[error("parse json: {0}")]
    ParseJson(String),
    #[error("invalid card at index {index}: {source}")]
    InvalidCard {
        index: usize,
        #[source]
        source: CardSearchResultError,
    },
}

/// Cache thread-safe de cartes pour la recherche.
/// Stocke un `Arc<[T]>` pour que `get()` clone seulement le pointeur (O(1)), pas les données.
pub struct CardCache {
    inner: RwLock<Arc<[CardSearchResult]>>,
}

impl CardCache {
    /// Crée un cache vide (aucune carte en mémoire).
    pub fn empty() -> Self {
        Self {
            inner: RwLock::new(Arc::from([])),
        }
    }

    /// Crée un cache à partir d’une liste de cartes (ex. chargée depuis la DB).
    pub fn from_cards(cards: Vec<CardSearchResult>) -> Self {
        let arc = Arc::from(cards.into_boxed_slice());
        Self {
            inner: RwLock::new(arc),
        }
    }

    /// Charge le cache depuis un fichier JSON (format API : `{"data": [...]}`).
    /// Chaque élément est validé en `CardSearchResult` ; la première erreur rencontrée est retournée.
    pub fn load_from_path(path: &Path) -> Result<Self, CardCacheError> {
        let contents =
            std::fs::read_to_string(path).map_err(|e| CardCacheError::Io(e.to_string()))?;
        let raw: CardsApiResponse = serde_json::from_str(&contents)
            .map_err(|e| CardCacheError::ParseJson(e.to_string()))?;
        let cards: Vec<CardSearchResult> = raw
            .data
            .into_iter()
            .enumerate()
            .map(|(i, r)| {
                CardSearchResult::try_from(r).map_err(|e| CardCacheError::InvalidCard {
                    index: i,
                    source: e,
                })
            })
            .collect::<Result<Vec<_>, _>>()?;
        let arc = Arc::from(cards.into_boxed_slice());
        Ok(Self {
            inner: RwLock::new(arc),
        })
    }

    /// Retourne un clone de l’`Arc` (O(1)), pas des données. Utilisable partout comme `&[CardSearchResult]` via `Deref`.
    pub fn get(&self) -> Arc<[CardSearchResult]> {
        self.inner.read().expect("RwLock poisoned").clone()
    }

    /// Vide le cache (après fetch_cards, avant rechargement).
    pub fn invalidate(&self) {
        let mut guard = self.inner.write().expect("RwLock poisoned");
        *guard = Arc::from([]);
    }

    /// Recharge le cache depuis un fichier (invalidation + chargement).
    pub fn reload(&self, path: &Path) -> Result<(), CardCacheError> {
        let new_cache = Self::load_from_path(path)?;
        let mut guard = self.inner.write().expect("RwLock poisoned");
        *guard = new_cache.inner.read().expect("RwLock poisoned").clone();
        Ok(())
    }

    /// Remplace le contenu du cache par une nouvelle liste (ex. après rechargement depuis la DB).
    pub fn replace_with(&self, cards: Vec<CardSearchResult>) {
        let mut guard = self.inner.write().expect("RwLock poisoned");
        *guard = Arc::from(cards.into_boxed_slice());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_cache_returns_empty_vec() {
        let cache = CardCache::empty();
        assert!(cache.get().is_empty());
    }

    #[test]
    fn invalidate_clears_cache() {
        let cache = CardCache::empty();
        cache.invalidate();
        assert!(cache.get().is_empty());
    }
}
