//! Import bulk YGOProDeck : idempotence, rate limit, retry backoff.
//! Charge les URLs candidates depuis la table `cards` (sans refetch API), filtre celles déjà en `images`, puis importe uniquement les nouvelles.

use std::collections::HashSet;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use backoff::ExponentialBackoff;
use backoff::future::retry;
use tokio::sync::Semaphore;
use tokio::time::sleep;
use tracing::{info, warn};

use super::fetch::FetchError;
use super::repository::{ImageRecord, ImageRepository, RepositoryError};
use super::{fetch_image_bytes, process_image};
use crate::db;
use crate::storage::{Storage, StorageError};

const MAX_CONCURRENT: usize = 3;
const DELAY_MS: u64 = 300;
const LOG_EVERY: u64 = 100;

#[derive(Debug, thiserror::Error)]
pub enum ImporterError {
    #[error("fetch list: {0}")]
    FetchList(#[from] reqwest::Error),
    #[error("parse: {0}")]
    Parse(String),
    #[error("fetch image: {0}")]
    FetchImage(#[from] FetchError),
    #[error("process: {0}")]
    Process(#[from] super::ProcessError),
    #[error("storage: {0}")]
    Storage(#[from] StorageError),
    #[error("repo: {0}")]
    Repository(#[from] RepositoryError),
}

async fn fetch_with_retry(url: &str) -> Result<Vec<u8>, ImporterError> {
    let url = url.to_string();
    let op = || async {
        let b = fetch_image_bytes(&url).await.map_err(|e| {
            if matches!(&e, FetchError::Http(_) | FetchError::Status(429)) {
                backoff::Error::transient(e)
            } else {
                backoff::Error::permanent(e)
            }
        })?;
        Ok::<_, backoff::Error<FetchError>>(b)
    };
    retry(ExponentialBackoff::default(), op)
        .await
        .map_err(ImporterError::FetchImage)
}

/// Compteurs après [`ImageImporter::rehydrate_storage`].
#[derive(Debug, Default, Clone, Copy)]
pub struct RehydrateStats {
    pub uploaded: u64,
    pub skipped: u64,
    pub failed: u64,
}

pub struct ImageImporter;

impl ImageImporter {
    /// Re-télécharge depuis `original_url` et réécrit **original / desktop / mobile** aux chemins
    /// déjà présents en base (`path_*`). Ne modifie pas les lignes SQL : les clés GCS restent alignées.
    ///
    /// Si `force` est faux, les lignes dont `path_desktop` existe déjà dans le stockage sont ignorées.
    /// Cas d’usage : DB remplie + fichiers sur disque local éphémère → activer GCS puis appeler cette
    /// tâche pour remplir le bucket sans changer les UUID ni les chemins.
    pub async fn rehydrate_storage(
        pool: sqlx::PgPool,
        storage: Arc<dyn Storage>,
        force: bool,
    ) -> Result<RehydrateStats, ImporterError> {
        let rows = ImageRepository::list(&pool).await?;
        let total = rows.len();
        info!("rehydrate storage: {} ligne(s), force={}", total, force);
        let sem = Arc::new(Semaphore::new(MAX_CONCURRENT));
        let mut stats = RehydrateStats::default();
        for (i, record) in rows.into_iter().enumerate() {
            let path_desk = Path::new(&record.path_desktop);
            if !force && storage.exists(path_desk).await? {
                stats.skipped += 1;
                continue;
            }
            let _permit = sem
                .acquire()
                .await
                .map_err(|_| ImporterError::Parse("sem closed".into()))?;
            sleep(Duration::from_millis(DELAY_MS)).await;
            match Self::rehydrate_one(&storage, &record).await {
                Ok(()) => {
                    stats.uploaded += 1;
                    if stats.uploaded % LOG_EVERY == 0 {
                        info!(
                            "rehydrate storage: {} uploadée(s) (itération i={})",
                            stats.uploaded, i
                        );
                    }
                }
                Err(e) => {
                    stats.failed += 1;
                    warn!(
                        "rehydrate storage: échec id={} url={}: {}",
                        record.id, record.original_url, e
                    );
                }
            }
        }
        info!(
            "rehydrate storage: terminé — uploadées={}, ignorées={}, échecs={}",
            stats.uploaded, stats.skipped, stats.failed
        );
        Ok(stats)
    }

    async fn rehydrate_one(
        storage: &Arc<dyn Storage>,
        record: &ImageRecord,
    ) -> Result<(), ImporterError> {
        let bytes = fetch_with_retry(record.original_url.as_str()).await?;
        let v = process_image(&bytes)?;
        storage
            .store(Path::new(&record.path_original), &v.original)
            .await?;
        storage
            .store(Path::new(&record.path_desktop), &v.desktop)
            .await?;
        storage
            .store(Path::new(&record.path_mobile), &v.mobile)
            .await?;
        Ok(())
    }

    pub async fn run(pool: sqlx::PgPool, storage: Arc<dyn Storage>) -> Result<u64, ImporterError> {
        let candidates = db::list_card_image_urls(&pool)
            .await
            .map_err(|e| ImporterError::Parse(e.to_string()))?;
        if candidates.is_empty() {
            info!("import images: aucune URL dans cards (lancer fetch_cards d'abord)");
            return Ok(0);
        }
        let existing: HashSet<String> = ImageRepository::list_original_urls(&pool)
            .await?
            .into_iter()
            .collect();
        let urls: Vec<String> = candidates
            .into_iter()
            .filter(|u| !existing.contains(u))
            .collect();
        let total = urls.len() as u64;
        if total == 0 {
            info!(
                "import images: toutes les URLs sont déjà en base ({}), rien à importer",
                existing.len()
            );
            return Ok(0);
        }
        info!(
            "import images: {} URLs à importer ({} déjà en base)",
            total,
            existing.len()
        );
        let sem = Arc::new(Semaphore::new(MAX_CONCURRENT));
        let mut processed: u64 = 0;
        for (i, url) in urls.into_iter().enumerate() {
            let _permit = sem
                .acquire()
                .await
                .map_err(|_| ImporterError::Parse("sem closed".into()))?;
            sleep(Duration::from_millis(DELAY_MS)).await;
            match Self::import_one(&pool, &storage, &url).await {
                Ok(()) => {
                    processed += 1;
                    if processed % LOG_EVERY == 0 {
                        info!("import images: {} / {} traitées", processed, total);
                    }
                }
                Err(e) => warn!("import images: échec {} (i={}): {}", url, i, e),
            }
        }
        info!("import images: terminé — {} importées", processed);
        Ok(processed)
    }

    async fn import_one(
        pool: &sqlx::PgPool,
        storage: &Arc<dyn Storage>,
        url: &str,
    ) -> Result<(), ImporterError> {
        let bytes = fetch_with_retry(url).await?;
        let v = process_image(&bytes)?;
        let id = uuid::Uuid::new_v4();
        let base = format!("images/{id}");
        let p_orig = format!("{base}/original.webp");
        let p_desk = format!("{base}/desktop.webp");
        let p_mob = format!("{base}/mobile.webp");
        storage.store(Path::new(&p_orig), &v.original).await?;
        storage.store(Path::new(&p_desk), &v.desktop).await?;
        storage.store(Path::new(&p_mob), &v.mobile).await?;
        ImageRepository::insert(pool, url, &p_orig, &p_desk, &p_mob, v.width, v.height).await?;
        Ok(())
    }
}
