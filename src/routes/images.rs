//! Endpoints : import + service des images.

use crate::images::{
    FetchError, ImageRecord, ImageRepository, ProcessError, RepositoryError, fetch_image_bytes,
    process_image,
};
use crate::storage::{Storage, StorageError};
use actix_web::{HttpResponse, get, http::StatusCode, post, web};
use serde::Deserialize;
use sqlx::PgPool;
use std::path::Path;
use std::sync::Arc;
use tracing::instrument;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ImportBody {
    pub url: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ImageRouteError {
    #[error("fetch: {0}")]
    Fetch(#[from] FetchError),
    #[error("process: {0}")]
    Process(#[from] ProcessError),
    #[error("storage: {0}")]
    Storage(#[from] StorageError),
    #[error("repository: {0}")]
    Repository(#[from] RepositoryError),
    #[error("pool required")]
    NoPool,
    #[error("storage required")]
    NoStorage,
}
impl actix_web::ResponseError for ImageRouteError {
    fn status_code(&self) -> StatusCode {
        match self {
            ImageRouteError::Fetch(_) | ImageRouteError::Process(_) => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[post("/images/import")]
#[instrument(skip(pool, storage))]
pub async fn import_image(
    pool: Option<web::Data<PgPool>>,
    storage: Option<web::Data<Arc<dyn Storage>>>,
    body: web::Json<ImportBody>,
) -> Result<HttpResponse, ImageRouteError> {
    let pool = pool.as_deref().ok_or(ImageRouteError::NoPool)?;
    let storage = storage.as_deref().ok_or(ImageRouteError::NoStorage)?;
    let bytes = fetch_image_bytes(&body.url).await?;
    let variants = process_image(&bytes)?;
    let id = uuid::Uuid::new_v4();
    let base = format!("images/{}", id);
    let path_original = format!("{}/original.webp", base);
    let path_desktop = format!("{}/desktop.webp", base);
    let path_mobile = format!("{}/mobile.webp", base);
    storage
        .store(Path::new(&path_original), &variants.original)
        .await?;
    storage
        .store(Path::new(&path_desktop), &variants.desktop)
        .await?;
    storage
        .store(Path::new(&path_mobile), &variants.mobile)
        .await?;
    let inserted_id = ImageRepository::insert(
        pool,
        &body.url,
        &path_original,
        &path_desktop,
        &path_mobile,
        variants.width,
        variants.height,
    )
    .await?;
    Ok(HttpResponse::Created().json(serde_json::json!({"id": inserted_id.to_string(), "path_original": path_original, "path_desktop": path_desktop, "path_mobile": path_mobile})))
}

#[get("/images")]
pub async fn list_images(pool: Option<web::Data<PgPool>>) -> Result<HttpResponse, ImageRouteError> {
    let pool = pool.as_deref().ok_or(ImageRouteError::NoPool)?;
    let records = ImageRepository::list(pool).await?;
    Ok(HttpResponse::Ok().json(
        records
            .into_iter()
            .map(|r| image_record_to_json(&r))
            .collect::<Vec<_>>(),
    ))
}

#[get("/images/{id}")]
pub async fn get_image(
    pool: Option<web::Data<PgPool>>,
    id: web::Path<Uuid>,
) -> Result<HttpResponse, ImageRouteError> {
    let pool = pool.as_deref().ok_or(ImageRouteError::NoPool)?;
    match ImageRepository::get_by_id(pool, *id).await? {
        Some(record) => Ok(HttpResponse::Ok().json(image_record_to_json(&record))),
        None => Ok(HttpResponse::NotFound().body("image not found")),
    }
}

#[get("/images/{id}/file/{variant}")]
pub async fn serve_image_file(
    storage: Option<web::Data<Arc<dyn Storage>>>,
    pool: Option<web::Data<PgPool>>,
    path: web::Path<(Uuid, String)>,
) -> Result<HttpResponse, ImageRouteError> {
    let (id, variant) = path.into_inner();
    let storage = storage.as_deref().ok_or(ImageRouteError::NoStorage)?;
    let pool = pool.as_deref().ok_or(ImageRouteError::NoPool)?;
    let record = match ImageRepository::get_by_id(pool, id).await? {
        Some(r) => r,
        None => return Ok(HttpResponse::NotFound().body("image not found")),
    };
    let file_path = match variant.as_str() {
        "original" => record.path_original,
        "desktop" => record.path_desktop,
        "mobile" => record.path_mobile,
        _ => return Ok(HttpResponse::BadRequest().body("variant must be original|desktop|mobile")),
    };
    let bytes = match storage.get(Path::new(&file_path)).await? {
        Some(b) => b,
        // Fichier absent (disque éphémère Cloud Run, autre instance, ou jamais importé) : 404 explicite, pas 500.
        None => return Ok(HttpResponse::NotFound().body("image file not on this instance")),
    };
    Ok(HttpResponse::Ok().content_type("image/webp").body(bytes))
}

fn image_record_to_json(r: &ImageRecord) -> serde_json::Value {
    serde_json::json!({"id": r.id.to_string(), "original_url": r.original_url, "path_original": r.path_original, "path_desktop": r.path_desktop, "path_mobile": r.path_mobile, "width": r.width, "height": r.height, "mime_type": r.mime_type, "created_at": r.created_at.to_rfc3339()})
}
