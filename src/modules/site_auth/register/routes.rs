//! Inscription utilisateur site (`/register`).

use actix_session::Session;
use actix_web::{get, post, web, HttpResponse};

use crate::auth::csrf;
use crate::auth::session::SITE_USER_SESSION_KEY;
use crate::auth::user_db::{self, CreateUserError};
use crate::modules::template_error::TemplateError;

#[derive(Debug, serde::Deserialize)]
pub struct RegisterForm {
    pub pseudo: String,
    pub password: String,
    pub accept_conditions: Option<String>,
    pub csrf_token: Option<String>,
}

#[get("/register")]
pub async fn register_page(
    session: Session,
    tera: web::Data<tera::Tera>,
) -> Result<HttpResponse, TemplateError> {
    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (register): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    ctx.insert("csrf_token", &csrf_token);
    ctx.insert("error", &None::<String>);
    ctx.insert("pseudo_retry", "");
    let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body))
}

#[post("/register")]
pub async fn register_submit(
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    tera: web::Data<tera::Tera>,
    form: web::Form<RegisterForm>,
) -> Result<HttpResponse, TemplateError> {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return Ok(csrf::csrf_rejected());
    }

    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (register post): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };

    let pool = match pool {
        Some(p) => p,
        None => {
            let mut ctx = tera::Context::new();
            ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
            ctx.insert("csrf_token", &csrf_token);
            ctx.insert("error", &Some("Service indisponible. Réessayez plus tard."));
            ctx.insert("pseudo_retry", &form.pseudo);
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            return Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body));
        }
    };
    let accept = form.accept_conditions.as_deref() == Some("on");
    if !accept {
        let mut ctx = tera::Context::new();
        ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
        ctx.insert("csrf_token", &csrf_token);
        ctx.insert(
            "error",
            &Some("Vous devez accepter les conditions d'utilisation."),
        );
        ctx.insert("pseudo_retry", &form.pseudo);
        let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
        return Ok(HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(body));
    }
    match user_db::create_user(pool.get_ref(), &form.pseudo, &form.password).await {
        Ok(_) => {
            let user = user_db::get_user_by_pseudo(pool.get_ref(), &form.pseudo)
                .await
                .ok()
                .flatten();
            if let Some(u) = user {
                let _ = session.insert(SITE_USER_SESSION_KEY, u.pseudo.clone());
            }
            csrf::invalidate_csrf_token(&session);
            Ok(HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish())
        }
        Err(e) => {
            let msg = match &e {
                CreateUserError::Pseudo(_) => e.to_string(),
                CreateUserError::Password(_) => e.to_string(),
                CreateUserError::PseudoTaken => "Ce pseudo est déjà utilisé.".to_string(),
                CreateUserError::Hash | CreateUserError::Db(_) => {
                    "Erreur technique. Réessayez.".to_string()
                }
            };
            let mut ctx = tera::Context::new();
            ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
            ctx.insert("csrf_token", &csrf_token);
            ctx.insert("error", &Some(msg));
            ctx.insert("pseudo_retry", &form.pseudo);
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body))
        }
    }
}
