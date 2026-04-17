//! Page d’accueil / shell builder (Tera).

use std::collections::HashMap;

use actix_session::Session;
use actix_web::{HttpResponse, get, web};
use sqlx::PgPool;

use crate::auth::csrf;
use crate::auth::session::SITE_USER_SESSION_KEY;
use crate::modules::insights_fidraulis_gy::{self, repository as fid_gy_repo};
use crate::modules::insights_fidraulis_telemetry::env as fid_telemetry_env;
use crate::modules::template_error::TemplateError;

#[get("/")]
pub async fn index(
    tera: web::Data<tera::Tera>,
    session: Session,
    query: web::Query<HashMap<String, String>>,
    pool: Option<web::Data<PgPool>>,
) -> Result<HttpResponse, TemplateError> {
    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (index): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    ctx.insert("csrf_token", &csrf_token);
    let user_pseudo: Option<String> = session.get(SITE_USER_SESSION_KEY).ok().flatten();
    ctx.insert("user_pseudo", &user_pseudo);
    let login_error = query.get("login_error").is_some();
    ctx.insert("login_error", &login_error);
    ctx.insert(
        "fidraulis_telemetry_mode",
        fid_telemetry_env::fidraulis_telemetry_mode_template_value(),
    );
    let fid_json = match pool {
        Some(p) => match insights_fidraulis_gy::list_validated_passcodes(p.get_ref()).await {
            Ok(ids) => serde_json::to_string(&ids).unwrap_or_else(|_| "[]".to_string()),
            Err(e) => {
                if fid_gy_repo::sqlx_is_undefined_table(&e) {
                    "[]".to_string()
                } else {
                    tracing::warn!(error = %e, "index: list_validated_passcodes fidraulis_gy");
                    "[]".to_string()
                }
            }
        },
        None => "[]".to_string(),
    };
    ctx.insert("fidraulis_gy_admin_validated_passcodes_json", &fid_json);
    let body = tera.render("index.html", &ctx).map_err(TemplateError)?;
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body))
}
