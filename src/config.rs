//! Configuration chargée depuis les variables d'environnement.
//! Switch local / GCS via STORAGE_BACKEND.

use std::path::PathBuf;

#[derive(Debug, Clone)]
pub enum StorageBackend {
    Local,
    Gcs,
}

impl std::str::FromStr for StorageBackend {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "local" => Ok(StorageBackend::Local),
            "gcs" => Ok(StorageBackend::Gcs),
            _ => Err(format!(
                "STORAGE_BACKEND invalide: {s} (attendu: local | gcs)"
            )),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pub storage_backend: StorageBackend,
    pub local_storage_path: PathBuf,
    pub gcs_bucket_name: Option<String>,
}

impl Config {
    /// Charge la config depuis l'environnement.
    pub fn from_env() -> Result<Self, String> {
        let storage_backend = std::env::var("STORAGE_BACKEND")
            .unwrap_or_else(|_| "local".to_string())
            .parse()?;
        let local_storage_path = std::env::var("LOCAL_STORAGE_PATH")
            .unwrap_or_else(|_| "/storage".to_string())
            .into();
        let gcs_bucket_name = std::env::var("GCS_BUCKET_NAME").ok();
        Ok(Self {
            storage_backend,
            local_storage_path,
            gcs_bucket_name,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn storage_backend_local() {
        assert!(matches!(
            "local".parse::<StorageBackend>(),
            Ok(StorageBackend::Local)
        ));
        assert!(matches!(
            "LOCAL".parse::<StorageBackend>(),
            Ok(StorageBackend::Local)
        ));
    }

    #[test]
    fn storage_backend_gcs() {
        assert!(matches!(
            "gcs".parse::<StorageBackend>(),
            Ok(StorageBackend::Gcs)
        ));
        assert!(matches!(
            "GCS".parse::<StorageBackend>(),
            Ok(StorageBackend::Gcs)
        ));
    }

    #[test]
    fn storage_backend_invalid() {
        assert!("invalid".parse::<StorageBackend>().is_err());
        assert!("".parse::<StorageBackend>().is_err());
    }

    #[test]
    fn config_from_env_defaults() {
        unsafe {
            std::env::remove_var("STORAGE_BACKEND");
            std::env::remove_var("LOCAL_STORAGE_PATH");
            std::env::remove_var("GCS_BUCKET_NAME");
        }
        let cfg = Config::from_env().unwrap();
        assert!(matches!(cfg.storage_backend, StorageBackend::Local));
        assert_eq!(cfg.local_storage_path, std::path::PathBuf::from("/storage"));
        assert!(cfg.gcs_bucket_name.is_none());
    }

    #[test]
    fn config_from_env_storage_local() {
        unsafe {
            std::env::set_var("STORAGE_BACKEND", "local");
            std::env::set_var("LOCAL_STORAGE_PATH", "/tmp/storage");
            std::env::remove_var("GCS_BUCKET_NAME");
        }
        let cfg = Config::from_env().unwrap();
        assert!(matches!(cfg.storage_backend, StorageBackend::Local));
        assert_eq!(
            cfg.local_storage_path,
            std::path::PathBuf::from("/tmp/storage")
        );
        unsafe {
            std::env::remove_var("STORAGE_BACKEND");
            std::env::remove_var("LOCAL_STORAGE_PATH");
        }
    }
}
