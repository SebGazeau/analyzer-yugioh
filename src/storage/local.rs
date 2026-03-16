//! Stockage sur le filesystem local (volume Docker en dev).

use std::path::{Path, PathBuf};

use async_trait::async_trait;
use tracing::instrument;

use super::{Storage, StorageError};

#[derive(Debug, Clone)]
pub struct LocalStorage {
    root: PathBuf,
}

impl LocalStorage {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    fn resolve(&self, path: &Path) -> PathBuf {
        self.root.join(path)
    }
}

#[async_trait]
impl Storage for LocalStorage {
    #[instrument(skip(self, bytes), fields(path = %path.display()))]
    async fn store(&self, path: &Path, bytes: &[u8]) -> Result<(), StorageError> {
        let full = self.resolve(path);
        if let Some(parent) = full.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&full, bytes).await?;
        Ok(())
    }

    #[instrument(skip(self), fields(path = %path.display()))]
    async fn get(&self, path: &Path) -> Result<Option<Vec<u8>>, StorageError> {
        let full = self.resolve(path);
        match tokio::fs::read(&full).await {
            Ok(data) => Ok(Some(data)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    #[instrument(skip(self), fields(path = %path.display()))]
    async fn exists(&self, path: &Path) -> Result<bool, StorageError> {
        let full = self.resolve(path);
        Ok(full.try_exists().unwrap_or(false))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn block_on<F: std::future::Future>(f: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(f)
    }

    #[test]
    fn local_storage_store_and_get() {
        let dir = std::env::temp_dir().join("analyzer_yugioh_storage_test");
        let _ = std::fs::remove_dir_all(&dir);
        let storage = LocalStorage::new(dir.clone());
        let path = Path::new("subdir/file.bin");
        let data = b"hello world";
        block_on(storage.store(path, data)).unwrap();
        let read = block_on(storage.get(path)).unwrap();
        assert_eq!(read.as_deref(), Some(data.as_slice()));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn local_storage_get_missing_returns_none() {
        let dir = std::env::temp_dir().join("analyzer_yugioh_storage_missing_test");
        let _ = std::fs::remove_dir_all(&dir);
        let storage = LocalStorage::new(dir);
        let read = block_on(storage.get(Path::new("nonexistent"))).unwrap();
        assert!(read.is_none());
    }

    #[test]
    fn local_storage_exists() {
        let dir = std::env::temp_dir().join("analyzer_yugioh_storage_exists_test");
        let _ = std::fs::remove_dir_all(&dir);
        let storage = LocalStorage::new(dir.clone());
        assert!(!block_on(storage.exists(Path::new("a"))).unwrap());
        block_on(storage.store(Path::new("a"), b"x")).unwrap();
        assert!(block_on(storage.exists(Path::new("a"))).unwrap());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
