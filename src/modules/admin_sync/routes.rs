//! Sync cartes / cache / enrichissement YGOrg (routes admin protégées).

use actix_web::{HttpResponse, get, http::StatusCode, web};
use serde::Deserialize;

use crate::shared::search::cache::CardCache;

/// Redirection `GET /admin` → `/admin/login` (point d’entrée admin sans trailing path).
#[get("")]
pub async fn admin_index() -> HttpResponse {
    HttpResponse::SeeOther()
        .append_header(("Location", "/admin/login"))
        .finish()
}

#[get("/fetch_cards")]
pub async fn fetch_cards(
    card_cache: web::Data<CardCache>,
    cards_path: web::Data<String>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    if let Some(pool) = pool {
        match super::service::fetch_cards_with_pool(pool.get_ref(), card_cache.get_ref()).await {
            Ok(body) => return HttpResponse::Ok().body(body),
            Err(e) => {
                eprintln!("fetch_cards: {e}");
                return HttpResponse::InternalServerError().body(e);
            }
        }
    }
    match super::service::fetch_cards_file_fallback(cards_path.as_str(), card_cache.get_ref()).await
    {
        Ok(body) => HttpResponse::Ok().body(body),
        Err(e) => {
            eprintln!("fetch_cards: {e}");
            HttpResponse::InternalServerError().body(e)
        }
    }
}

#[get("/reload_cache_from_db")]
pub async fn reload_cache_from_db(
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis pour recharger le cache depuis la base.");
    };
    match super::service::reload_cache_from_db(pool.get_ref(), card_cache.get_ref()).await {
        Ok(body) => HttpResponse::Ok()
            .content_type("text/plain; charset=utf-8")
            .body(body),
        Err(e) => {
            tracing::error!(error = %e, "reload_cache_from_db");
            HttpResponse::InternalServerError()
                .content_type("text/plain; charset=utf-8")
                .body(e)
        }
    }
}

#[get("/enrich_ygorganization")]
pub async fn enrich_ygorganization(
    pool: Option<web::Data<sqlx::PgPool>>,
    query: web::Query<crate::ygorganization::EnrichQuery>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable().body("PostgreSQL requis pour l’enrichissement.");
    };
    let client = match crate::ygorganization::build_http_client() {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::InternalServerError().body(format!("Client HTTP reqwest: {e}"));
        }
    };
    match crate::ygorganization::run_enrichment(pool.get_ref(), &client, &query).await {
        Ok(stats) => HttpResponse::Ok()
            .content_type("text/plain; charset=utf-8")
            .body(stats.to_string()),
        Err(e) => {
            let code = match &e {
                crate::ygorganization::YgOrgError::BadQuery(_)
                | crate::ygorganization::YgOrgError::RevisionNotInitialized
                | crate::ygorganization::YgOrgError::NameIndexMissing
                | crate::ygorganization::YgOrgError::BadNameIndex => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            HttpResponse::build(code)
                .content_type("text/plain; charset=utf-8")
                .body(e.to_string())
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PreviewCardMetadataFillQuery {
    #[serde(default = "preview_card_metadata_fill_default_max")]
    pub max: u32,
}

fn preview_card_metadata_fill_default_max() -> u32 {
    5000
}

#[get("/preview_card_metadata_fill")]
pub async fn preview_card_metadata_fill(
    pool: Option<web::Data<sqlx::PgPool>>,
    query: web::Query<PreviewCardMetadataFillQuery>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis pour la prévisualisation.");
    };
    let max_rows = query.max.min(100_000) as i64;
    match super::service::preview_card_metadata_fill_body(pool.get_ref(), max_rows).await {
        Ok(out) => HttpResponse::Ok()
            .content_type("text/plain; charset=utf-8")
            .body(out),
        Err(e) => HttpResponse::InternalServerError()
            .content_type("text/plain; charset=utf-8")
            .body(e),
    }
}

#[derive(Debug, Deserialize)]
pub struct ApplyCardMetadataFillQuery {
    #[serde(default = "apply_card_metadata_fill_default_max")]
    pub max: u32,
    pub write: Option<u8>,
}

fn apply_card_metadata_fill_default_max() -> u32 {
    500
}

#[get("/apply_card_metadata_fill")]
pub async fn apply_card_metadata_fill(
    pool: Option<web::Data<sqlx::PgPool>>,
    card_cache: web::Data<CardCache>,
    query: web::Query<ApplyCardMetadataFillQuery>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis.");
    };
    let max_rows = query.max.min(10_000) as i64;
    let do_write = query.write == Some(1);
    match super::service::apply_card_metadata_fill_body(
        pool.get_ref(),
        card_cache.get_ref(),
        max_rows,
        do_write,
    )
    .await
    {
        Ok(out) => HttpResponse::Ok()
            .content_type("text/plain; charset=utf-8")
            .body(out),
        Err(e) => HttpResponse::InternalServerError()
            .content_type("text/plain; charset=utf-8")
            .body(e),
    }
}
