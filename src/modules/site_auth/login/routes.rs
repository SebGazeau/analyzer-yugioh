//! Connexion utilisateur site (`POST /login`).

use actix_session::Session;
use actix_web::{HttpResponse, post, web};

use crate::auth::csrf;
use crate::auth::session::{
    SITE_USER_ID_SESSION_KEY, SITE_USER_SESSION_EPOCH_KEY, SITE_USER_SESSION_KEY,
};
use crate::auth::user_db;

#[derive(Debug, serde::Deserialize)]
pub struct LoginForm {
    pub pseudo: String,
    pub password: String,
    pub csrf_token: Option<String>,
}

#[post("/login")]
pub async fn login_submit(
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    form: web::Form<LoginForm>,
) -> HttpResponse {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return csrf::csrf_rejected();
    }
    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish();
        }
    };
    match user_db::authenticate(pool.get_ref(), form.pseudo.trim(), &form.password).await {
        Ok(Some(user)) => {
            if session.insert(SITE_USER_SESSION_KEY, user.pseudo).is_err() {
                tracing::error!("session insert failed");
            }
            if session.insert(SITE_USER_ID_SESSION_KEY, user.id).is_err() {
                tracing::error!("session insert site_user_id failed");
            }
            if session
                .insert(SITE_USER_SESSION_EPOCH_KEY, user.session_epoch)
                .is_err()
            {
                tracing::error!("session insert session_epoch failed");
            }
            csrf::invalidate_csrf_token(&session);
            let location = if user.force_enable_2fa_after_reset {
                "/auth/2fa/enforce"
            } else {
                "/"
            };
            HttpResponse::SeeOther()
                .append_header(("Location", location))
                .finish()
        }
        _ => HttpResponse::SeeOther()
            .append_header(("Location", "/?login_error=1"))
            .finish(),
    }
}
