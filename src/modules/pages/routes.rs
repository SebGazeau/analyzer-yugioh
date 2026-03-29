//! Page d’accueil / shell builder (Tera).

use std::collections::HashMap;

use actix_session::Session;
use actix_web::{HttpResponse, get, web};

use crate::auth::csrf;
use crate::auth::session::SITE_USER_SESSION_KEY;
use crate::modules::template_error::TemplateError;

#[get("/")]
pub async fn index(
    tera: web::Data<tera::Tera>,
    session: Session,
    query: web::Query<HashMap<String, String>>,
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
    let body = tera.render("index.html", &ctx).map_err(TemplateError)?;
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body))
}
