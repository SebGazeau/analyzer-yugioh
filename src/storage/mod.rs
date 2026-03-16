//! Backend de stockage abstrait : filesystem local (dev) ou GCS (prod).

mod gcs;
mod local;

use std::path::Path;
use std::sync::Arc;

use async_trait::async_trait;

use crate::config::Config;
use crate::config::StorageBackend;

pub use gcs::GcsStorage;
pub use local::LocalStorage;

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("storage: {0}")]
    Other(String),
}

#[async_trait]
pub trait Storage: Send + Sync {
    async fn store(&self, path: &Path, bytes: &[u8]) -> Result<(), StorageError>;
    async fn get(&self, path: &Path) -> Result<Option<Vec<u8>>, StorageError>;
    async fn exists(&self, path: &Path) -> Result<bool, StorageError>;
}

pub fn from_config(config: &Config) -> Result<Arc<dyn Storage>, String> {
    match &config.storage_backend {
        StorageBackend::Local => Ok(Arc::new(LocalStorage::new(
            config.local_storage_path.clone(),
        ))),
        StorageBackend::Gcs => {
            let bucket = config
                .gcs_bucket_name
                .as_deref()
                .ok_or("GCS_BUCKET_NAME requis quand STORAGE_BACKEND=gcs")?;
            Ok(Arc::new(GcsStorage::new(bucket)?))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use std::path::Path;

    fn block_on<F: std::future::Future>(f: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(f)
    }

    #[test]
    fn from_config_local_store_get() {
        let dir = std::env::temp_dir().join("analyzer_yugioh_from_config_test");
        let _ = std::fs::remove_dir_all(&dir);
        let config = Config {
            storage_backend: crate::config::StorageBackend::Local,
            local_storage_path: dir.clone(),
            gcs_bucket_name: None,
        };
        let storage = from_config(&config).unwrap();
        block_on(storage.store(Path::new("x"), b"data")).unwrap();
        let out = block_on(storage.get(Path::new("x"))).unwrap();
        assert_eq!(out.as_deref(), Some(b"data".as_slice()));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn from_config_gcs_without_bucket_fails() {
        let config = Config {
            storage_backend: crate::config::StorageBackend::Gcs,
            local_storage_path: std::path::PathBuf::from("/"),
            gcs_bucket_name: None,
        };
        let r = from_config(&config);
        if let Err(e) = r {
            assert!(e.contains("GCS_BUCKET_NAME"));
        } else {
            panic!("expected Err");
        }
    }
}
