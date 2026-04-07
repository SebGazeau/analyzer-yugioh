//! Scope /web : compat redirections, dashboard (session site), déconnexion.

use actix_session::Session;
use actix_web::{HttpResponse, get, post, web};

use crate::auth::csrf;
use crate::auth::session::{SITE_USER_SESSION_KEY, require_session};

/// Ancienne URL de « connexion » factice (sec-11) : redirige vers la page d’accueil (vraie auth).
#[get("/login")]
pub async fn login_page() -> HttpResponse {
    HttpResponse::SeeOther()
        .append_header(("Location", "/"))
        .finish()
}

#[derive(serde::Deserialize)]
pub struct LogoutForm {
    pub csrf_token: Option<String>,
}

#[post("/logout")]
pub async fn logout(session: Session, form: web::Form<LogoutForm>) -> HttpResponse {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return csrf::csrf_rejected();
    }
    let _ = session.remove(SITE_USER_SESSION_KEY);
    csrf::invalidate_csrf_token(&session);
    HttpResponse::SeeOther()
        .append_header(("Location", "/"))
        .finish()
}

#[get("/dashboard")]
pub async fn dashboard(session: Session) -> HttpResponse {
    let user_id = match require_session(&session) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish();
        }
    };
    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (web dashboard): {}", e);
            return HttpResponse::InternalServerError().body("session");
        }
    };
    let escaped = user_id
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('&', "&amp;");
    let csrf_esc = csrf_token
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");
    let body = include_str!("../../templates/web_inline/dashboard_logged_in.html")
        .replace("%%USER_ESC%%", &escaped)
        .replace("%%CSRF_ESC%%", &csrf_esc);
    HttpResponse::Ok().body(body)
}
