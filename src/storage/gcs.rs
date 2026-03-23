//! Google Cloud Storage — bucket **privé** (pas d’accès public).
//! Cloud Run utilise le compte de service de l’instance (ADC) : `roles/storage.objectAdmin`
//! ou au minimum `objectUser` pour lecture/écriture sur ce bucket.

#[cfg(feature = "gcs")]
use std::borrow::Cow;
use std::path::Path;

use async_trait::async_trait;

use super::{Storage, StorageError};

#[cfg(feature = "gcs")]
use google_cloud_storage::client::{Client, ClientConfig};
#[cfg(feature = "gcs")]
use google_cloud_storage::http::Error as GcsHttpError;
#[cfg(feature = "gcs")]
use google_cloud_storage::http::objects::download::Range;
#[cfg(feature = "gcs")]
use google_cloud_storage::http::objects::get::GetObjectRequest;
#[cfg(feature = "gcs")]
use google_cloud_storage::http::objects::upload::{Media, UploadObjectRequest, UploadType};

// ---------------------------------------------------------------------------
// Implémentation réelle (feature `gcs`)
// ---------------------------------------------------------------------------

#[cfg(feature = "gcs")]
pub struct GcsStorage {
    client: Client,
    bucket: String,
}

#[cfg(feature = "gcs")]
impl std::fmt::Debug for GcsStorage {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GcsStorage")
            .field("bucket", &self.bucket)
            .finish_non_exhaustive()
    }
}

#[cfg(feature = "gcs")]
impl GcsStorage {
    /// Authentification : métadonnées Cloud Run / `GOOGLE_APPLICATION_CREDENTIALS`, etc.
    pub async fn connect(bucket_name: &str) -> Result<Self, String> {
        let config = ClientConfig::default()
            .with_auth()
            .await
            .map_err(|e| format!("GCS auth: {e}"))?;
        let client = Client::new(config);
        Ok(Self {
            client,
            bucket: bucket_name.to_string(),
        })
    }

    fn object_name(path: &Path) -> String {
        path.to_string_lossy().replace('\\', "/")
    }

    fn map_err(e: GcsHttpError) -> StorageError {
        StorageError::Other(e.to_string())
    }

    fn is_not_found(e: &GcsHttpError) -> bool {
        matches!(e, GcsHttpError::Response(r) if r.code == 404)
    }
}

#[cfg(feature = "gcs")]
#[async_trait]
impl Storage for GcsStorage {
    async fn store(&self, path: &Path, bytes: &[u8]) -> Result<(), StorageError> {
        let name = Self::object_name(path);
        let mut media = Media::new(name);
        media.content_type = Cow::Borrowed("image/webp");
        media.content_length = Some(bytes.len() as u64);
        let upload_type = UploadType::Simple(media);
        let req = UploadObjectRequest {
            bucket: self.bucket.clone(),
            ..Default::default()
        };
        self.client
            .upload_object(&req, bytes.to_vec(), &upload_type)
            .await
            .map_err(Self::map_err)?;
        Ok(())
    }

    async fn get(&self, path: &Path) -> Result<Option<Vec<u8>>, StorageError> {
        let object = Self::object_name(path);
        let req = GetObjectRequest {
            bucket: self.bucket.clone(),
            object,
            ..Default::default()
        };
        match self.client.download_object(&req, &Range::default()).await {
            Ok(data) => Ok(Some(data)),
            Err(e) if Self::is_not_found(&e) => Ok(None),
            Err(e) => Err(Self::map_err(e)),
        }
    }

    async fn exists(&self, path: &Path) -> Result<bool, StorageError> {
        let object = Self::object_name(path);
        let req = GetObjectRequest {
            bucket: self.bucket.clone(),
            object,
            ..Default::default()
        };
        match self.client.get_object(&req).await {
            Ok(_) => Ok(true),
            Err(e) if Self::is_not_found(&e) => Ok(false),
            Err(e) => Err(Self::map_err(e)),
        }
    }
}

// ---------------------------------------------------------------------------
// Sans feature `gcs` : type factice (ne doit pas être utilisé si GCS est demandé)
// ---------------------------------------------------------------------------

#[cfg(not(feature = "gcs"))]
#[derive(Debug, Clone)]
pub struct GcsStorage {
    _bucket_name: String,
}

#[cfg(not(feature = "gcs"))]
impl GcsStorage {
    pub fn new(bucket_name: &str) -> Result<Self, String> {
        Ok(Self {
            _bucket_name: bucket_name.to_string(),
        })
    }
}

#[cfg(not(feature = "gcs"))]
#[async_trait]
impl Storage for GcsStorage {
    async fn store(&self, _path: &Path, _bytes: &[u8]) -> Result<(), StorageError> {
        Err(StorageError::Other(
            "GCS : compiler avec --features gcs".to_string(),
        ))
    }

    async fn get(&self, _path: &Path) -> Result<Option<Vec<u8>>, StorageError> {
        Err(StorageError::Other(
            "GCS : compiler avec --features gcs".to_string(),
        ))
    }

    async fn exists(&self, _path: &Path) -> Result<bool, StorageError> {
        Err(StorageError::Other(
            "GCS : compiler avec --features gcs".to_string(),
        ))
    }
}
