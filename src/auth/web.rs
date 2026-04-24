//! Scope /web : compat redirections, dashboard (session site), déconnexion.

use actix_session::Session;
use actix_web::{HttpResponse, get, post, web};

use crate::auth::csrf;
use crate::auth::session::{SITE_USER_ID_SESSION_KEY, SITE_USER_SESSION_KEY, require_session};

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
    let _ = session.remove(SITE_USER_ID_SESSION_KEY);
    csrf::invalidate_csrf_token(&session);
    HttpResponse::SeeOther()
        .append_header(("Location", "/"))
        .finish()
}

#[get("/dashboard")]
pub async fn dashboard(session: Session) -> HttpResponse {
    match require_session(&session) {
        Ok(_) => HttpResponse::SeeOther()
            .append_header(("Location", "/mon-compte"))
            .finish(),
        Err(_) => HttpResponse::SeeOther()
            .append_header(("Location", "/"))
            .finish(),
    }
}
