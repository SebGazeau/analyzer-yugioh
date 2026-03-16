//! Pipeline images : fetch → process → store → DB.

mod fetch;
mod importer;
mod process;
mod repository;

pub use fetch::{FetchError, fetch_image_bytes};
pub use importer::{ImageImporter, ImporterError};
pub use process::{ImageVariants, ProcessError, process_image};
pub use repository::{ImageRecord, ImageRepository, RepositoryError};
