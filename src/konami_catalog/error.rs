//! Erreurs du module catalogue Konami.

use thiserror::Error;

use crate::db::DbError;

#[derive(Debug, Error)]
pub enum KonamiCatalogError {
    #[error("client HTTP: {0}")]
    HttpClient(String),
    #[error("Konami HTTP après {attempts} tentative(s): {message}")]
    HttpRetry { attempts: u32, message: String },
    #[error("parse HTML catalogue Konami: {0}")]
    Parse(String),
    #[error("snapshot Konami introuvable — lancer `konami-pack-index` pour la locale voulue: {0}")]
    SnapshotMissing(String),
    #[error("JSON snapshot Konami: {0}")]
    SnapshotJson(#[from] serde_json::Error),
    #[error(transparent)]
    Db(#[from] DbError),
}
