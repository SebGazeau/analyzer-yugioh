//! Scope /web : session (login, logout, dashboard).

use actix_session::Session;
use actix_web::{HttpResponse, get, post, web};
use serde::Deserialize;

use crate::auth::session::require_session;

#[derive(Deserialize)]
pub struct LoginForm {
    pub user_id: String,
}

#[get("/login")]
pub async fn login_page() -> HttpResponse {
    HttpResponse::Ok().body(
        r#"<form method="post" action="/web/login">
        <label>User ID <input name="user_id" type="text"/></label>
        <button type="submit">Connexion</button>
        </form>"#,
    )
}

#[post("/login")]
pub async fn login(session: Session, form: web::Form<LoginForm>) -> HttpResponse {
    if let Err(e) = session.insert("user_id", form.user_id.clone()) {
        return HttpResponse::InternalServerError().body(format!("session error: {}", e));
    }
    HttpResponse::SeeOther()
        .append_header(("Location", "/web/dashboard"))
        .finish()
}

#[post("/logout")]
pub async fn logout(session: Session) -> HttpResponse {
    session.purge();
    HttpResponse::SeeOther()
        .append_header(("Location", "/web/login"))
        .finish()
}

#[get("/dashboard")]
pub async fn dashboard(session: Session) -> HttpResponse {
    let user_id = match require_session(&session) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::SeeOther()
                .append_header(("Location", "/web/login"))
                .finish();
        }
    };
    let escaped = user_id
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('&', "&amp;");
    HttpResponse::Ok().body(format!(
        r#"<p>Connecté en tant que <strong>{}</strong>.</p>
        <form method="post" action="/web/logout"><button type="submit">Déconnexion</button></form>"#,
        escaped
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn login_form_deserialize() {
        let form: LoginForm = serde_json::from_str(r#"{"user_id":"alice"}"#).unwrap();
        assert_eq!(form.user_id, "alice");
    }
}
