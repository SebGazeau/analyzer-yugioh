//! Stub GCS : non implémenté pour l'instant (prod ultérieure).

use std::path::Path;

use async_trait::async_trait;

use super::{Storage, StorageError};

#[derive(Debug, Clone)]
pub struct GcsStorage {
    _bucket_name: String,
}

impl GcsStorage {
    pub fn new(bucket_name: &str) -> Result<Self, String> {
        Ok(Self {
            _bucket_name: bucket_name.to_string(),
        })
    }
}

#[async_trait]
impl Storage for GcsStorage {
    async fn store(&self, _path: &Path, _bytes: &[u8]) -> Result<(), StorageError> {
        Err(StorageError::Other(
            "GCS non implémenté (utilisez STORAGE_BACKEND=local)".to_string(),
        ))
    }

    async fn get(&self, _path: &Path) -> Result<Option<Vec<u8>>, StorageError> {
        Err(StorageError::Other("GCS non implémenté".to_string()))
    }

    async fn exists(&self, _path: &Path) -> Result<bool, StorageError> {
        Err(StorageError::Other("GCS non implémenté".to_string()))
    }
}
