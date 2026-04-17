//! Routes HTTP — votes Fidraulis GY (session site) + lecture publique des passcodes validés admin.

use actix_session::Session;
use actix_web::{HttpRequest, HttpResponse, get, post, web};
use serde::Deserialize;
use sqlx::PgPool;

use crate::auth::csrf;
use crate::modules::decks::require_site_user_id;

use super::repository;

fn csrf_header_value(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("X-CSRF-Token")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// Liste publique des passcodes validés admin (petit volume) — alimente le builder sans requête authentifiée.
#[get("/insights/fidraulis/gy/validated-passcodes")]
pub async fn get_fidraulis_gy_validated_passcodes(pool: Option<web::Data<PgPool>>) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::Ok().json(serde_json::json!({ "passcodes": [] }));
    };
    match repository::list_validated_passcodes(pool.get_ref()).await {
        Ok(passcodes) => HttpResponse::Ok().json(serde_json::json!({ "passcodes": passcodes })),
        Err(e) => {
            if repository::sqlx_is_undefined_table(&e) {
                return HttpResponse::Ok().json(serde_json::json!({ "passcodes": [] }));
            }
            tracing::error!("get_fidraulis_gy_validated_passcodes: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "database" }))
        }
    }
}

/// État vote pour l’utilisateur courant (session site) sur une liste de passcodes.
#[get("/insights/fidraulis/gy/vote-state")]
pub async fn get_fidraulis_gy_vote_state(
    session: Session,
    pool: Option<web::Data<PgPool>>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::ServiceUnavailable()
                .json(serde_json::json!({ "error": "database_unavailable" }));
        }
    };
    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };
    let raw = query.get("passcodes").map(String::as_str).unwrap_or("");
    let passcodes: Vec<i64> = raw
        .split(',')
        .filter_map(|s| s.trim().parse::<i64>().ok())
        .filter(|&p| p > 0)
        .take(80)
        .collect();
    if passcodes.is_empty() {
        return HttpResponse::Ok().json(serde_json::json!({ "items": [] }));
    }
    match repository::vote_state_for_user(pool.get_ref(), site_user_id, &passcodes).await {
        Ok(items) => HttpResponse::Ok().json(serde_json::json!({ "items": items })),
        Err(e) => {
            if repository::sqlx_is_undefined_table(&e) {
                return HttpResponse::Ok().json(serde_json::json!({ "items": [] }));
            }
            tracing::error!("get_fidraulis_gy_vote_state: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "database" }))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PostFidraulisGyVoteBody {
    pub passcode: i64,
    pub verdict: String,
}

#[post("/insights/fidraulis/gy/vote")]
pub async fn post_fidraulis_gy_vote(
    session: Session,
    req: HttpRequest,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<PostFidraulisGyVoteBody>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::ServiceUnavailable()
                .json(serde_json::json!({ "error": "database_unavailable" }));
        }
    };
    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };
    if !csrf::verify_csrf_token(&session, csrf_header_value(&req).as_deref()) {
        return csrf::csrf_rejected();
    }
    let pc = body.passcode;
    if pc <= 0 {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_passcode" }));
    }
    let verdict = body.verdict.trim();
    if verdict != "approve" && verdict != "reject" {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_verdict" }));
    }
    match repository::is_passcode_admin_validated(pool.get_ref(), pc).await {
        Ok(true) => {
            return HttpResponse::Conflict()
                .json(serde_json::json!({ "error": "admin_validated_no_vote" }));
        }
        Ok(false) => {}
        Err(e) => {
            if repository::sqlx_is_undefined_table(&e) {
                return HttpResponse::ServiceUnavailable()
                    .json(serde_json::json!({ "error": "insight_schema_missing" }));
            }
            tracing::error!("post_fidraulis_gy_vote: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    }
    match repository::insert_user_vote(pool.get_ref(), site_user_id, pc, verdict).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "ok": true,
            "passcode": pc,
            "verdict": verdict,
        })),
        Err(e) if repository::is_unique_violation(&e) => {
            HttpResponse::Conflict().json(serde_json::json!({ "error": "already_voted" }))
        }
        Err(e) => {
            if repository::sqlx_is_undefined_table(&e) {
                return HttpResponse::ServiceUnavailable()
                    .json(serde_json::json!({ "error": "insight_schema_missing" }));
            }
            tracing::error!("post_fidraulis_gy_vote insert: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "database" }))
        }
    }
}
