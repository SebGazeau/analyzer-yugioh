//! Déconnexion utilisateur site (`POST /logout`).

use actix_session::Session;
use actix_web::{HttpResponse, post, web};

use crate::auth::csrf;
use crate::auth::session::SITE_USER_SESSION_KEY;

#[derive(Debug, serde::Deserialize)]
pub struct LogoutForm {
    pub csrf_token: Option<String>,
}

#[post("/logout")]
pub async fn logout_submit(session: Session, form: web::Form<LogoutForm>) -> HttpResponse {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return csrf::csrf_rejected();
    }
    session.remove(SITE_USER_SESSION_KEY);
    csrf::invalidate_csrf_token(&session);
    HttpResponse::SeeOther()
        .append_header(("Location", "/"))
        .finish()
}
