//! Endpoints : import + service des images.

use actix_session::Session;
use actix_web::{HttpRequest, HttpResponse, get, http::StatusCode, post, web};
use serde::Deserialize;
use sqlx::PgPool;
use std::path::Path;
use std::sync::Arc;
use tracing::instrument;
use uuid::Uuid;

use super::{AdminSecret, is_privileged_admin_request};
use crate::images::{
    FetchError, ImageRecord, ImageRepository, ProcessError, RepositoryError, UrlPolicyError,
    allowed_host_suffixes_from_env, fetch_image_bytes_trusted, process_image,
    validate_image_import_url,
};
use crate::storage::{Storage, StorageError};

#[derive(Debug, Deserialize)]
pub struct ImportBody {
    pub url: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ImageRouteError {
    #[error("forbidden")]
    Forbidden,
    #[error("url: {0}")]
    UrlPolicy(#[from] UrlPolicyError),
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
            ImageRouteError::Forbidden => StatusCode::FORBIDDEN,
            ImageRouteError::UrlPolicy(_) => StatusCode::BAD_REQUEST,
            ImageRouteError::Fetch(e) => match e {
                FetchError::UrlPolicy(_) | FetchError::Status(_) => StatusCode::BAD_REQUEST,
                FetchError::TooLarge { .. } => StatusCode::PAYLOAD_TOO_LARGE,
                FetchError::Http(_) => StatusCode::BAD_GATEWAY,
            },
            ImageRouteError::Process(e) => match e {
                ProcessError::InputTooLarge { .. } => StatusCode::PAYLOAD_TOO_LARGE,
                _ => StatusCode::BAD_REQUEST,
            },
            ImageRouteError::NoPool | ImageRouteError::NoStorage => StatusCode::SERVICE_UNAVAILABLE,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[post("/images/import")]
#[instrument(skip(pool, storage, session, admin))]
pub async fn import_image(
    req: HttpRequest,
    session: Session,
    admin: web::Data<AdminSecret>,
    pool: Option<web::Data<PgPool>>,
    storage: Option<web::Data<Arc<dyn Storage>>>,
    body: web::Json<ImportBody>,
) -> Result<HttpResponse, ImageRouteError> {
    if !is_privileged_admin_request(&req, &session, &admin.0) {
        return Err(ImageRouteError::Forbidden);
    }
    let suffixes = allowed_host_suffixes_from_env();
    let url = validate_image_import_url(&body.url, &suffixes)?;
    let pool = pool.as_deref().ok_or(ImageRouteError::NoPool)?;
    let storage = storage.as_deref().ok_or(ImageRouteError::NoStorage)?;
    let bytes = fetch_image_bytes_trusted(url.as_str()).await?;
    let variants = process_image(&bytes)?;
    let id = uuid::Uuid::new_v4();
    let base = format!("images/{id}");
    let path_original = format!("{base}/original.webp");
    let path_desktop = format!("{base}/desktop.webp");
    let path_mobile = format!("{base}/mobile.webp");
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
#[instrument(skip(pool, session, admin))]
pub async fn list_images(
    req: HttpRequest,
    session: Session,
    admin: web::Data<AdminSecret>,
    pool: Option<web::Data<PgPool>>,
) -> Result<HttpResponse, ImageRouteError> {
    if !is_privileged_admin_request(&req, &session, &admin.0) {
        return Err(ImageRouteError::Forbidden);
    }
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
#[instrument(skip(pool, session, admin))]
pub async fn get_image(
    req: HttpRequest,
    session: Session,
    admin: web::Data<AdminSecret>,
    pool: Option<web::Data<PgPool>>,
    id: web::Path<Uuid>,
) -> Result<HttpResponse, ImageRouteError> {
    if !is_privileged_admin_request(&req, &session, &admin.0) {
        return Err(ImageRouteError::Forbidden);
    }
    let pool = pool.as_deref().ok_or(ImageRouteError::NoPool)?;
    match ImageRepository::get_by_id(pool, *id).await? {
        Some(record) => Ok(HttpResponse::Ok().json(image_record_to_json(&record))),
        None => Ok(HttpResponse::NotFound().body("image not found")),
    }
}

/// Fichiers WebP servis **sans** auth admin : l’UUID agit comme URL opaque (mini-CDN pour le builder).
/// La liste (`GET /images`) et les métadonnées (`GET /images/{id}`) restent réservées aux admins (sec-06).
#[get("/images/{id}/file/{variant}")]
#[instrument(skip(storage, pool))]
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

#[cfg(test)]
mod tests {
    use super::ImageRouteError;
    use actix_web::ResponseError;
    use actix_web::http::StatusCode;

    #[test]
    fn image_route_forbidden_maps_to_403() {
        assert_eq!(
            ImageRouteError::Forbidden.status_code(),
            StatusCode::FORBIDDEN
        );
    }
}
