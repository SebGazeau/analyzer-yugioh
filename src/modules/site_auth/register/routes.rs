//! Inscription utilisateur site (`/register`).

use actix_session::Session;
use actix_web::{HttpRequest, HttpResponse, get, post, web};

use crate::auth::csrf;
use crate::auth::session::{SITE_USER_ID_SESSION_KEY, SITE_USER_SESSION_KEY};
use crate::auth::turnstile::{self, TurnstileConfig};
use crate::auth::user_db::{self, CreateUserError};
use crate::modules::template_error::TemplateError;

#[derive(Debug, serde::Deserialize)]
pub struct RegisterForm {
    pub pseudo: String,
    pub password: String,
    pub accept_conditions: Option<String>,
    pub csrf_token: Option<String>,
    #[serde(rename = "cf-turnstile-response")]
    pub cf_turnstile_response: Option<String>,
}

fn register_template_ctx(
    turnstile: &TurnstileConfig,
    csrf_token: &str,
    error: Option<String>,
    pseudo_retry: &str,
) -> tera::Context {
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    ctx.insert("csrf_token", &csrf_token);
    ctx.insert("error", &error);
    ctx.insert("pseudo_retry", &pseudo_retry);
    ctx.insert("turnstile_enabled", &turnstile.enabled());
    ctx.insert(
        "turnstile_site_key",
        turnstile.site_key.as_deref().unwrap_or(""),
    );
    ctx
}

#[get("/register")]
pub async fn register_page(
    session: Session,
    tera: web::Data<tera::Tera>,
    turnstile: web::Data<TurnstileConfig>,
) -> Result<HttpResponse, TemplateError> {
    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (register): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    let ctx = register_template_ctx(&turnstile, &csrf_token, None, "");
    let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body))
}

#[post("/register")]
pub async fn register_submit(
    req: HttpRequest,
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    tera: web::Data<tera::Tera>,
    turnstile: web::Data<TurnstileConfig>,
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
            let ctx = register_template_ctx(
                &turnstile,
                &csrf_token,
                Some("Service indisponible. Réessayez plus tard.".into()),
                &form.pseudo,
            );
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            return Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body));
        }
    };

    if turnstile.enabled() {
        let secret = turnstile
            .secret_key
            .as_deref()
            .expect("turnstile.enabled() implies secret_key");
        let token = form.cf_turnstile_response.as_deref().unwrap_or("").trim();
        if token.is_empty() {
            let ctx = register_template_ctx(
                &turnstile,
                &csrf_token,
                Some("Veuillez valider la vérification anti-robot.".into()),
                &form.pseudo,
            );
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            return Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body));
        }
        let remote_ip = req.peer_addr().map(|a| a.ip().to_string());
        let ok = match turnstile::verify_token(secret, token, remote_ip.as_deref()).await {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("turnstile verify: {}", e);
                false
            }
        };
        if !ok {
            let ctx = register_template_ctx(
                &turnstile,
                &csrf_token,
                Some("Vérification anti-robot échouée ou expirée. Réessayez.".into()),
                &form.pseudo,
            );
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            return Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body));
        }
    }

    let accept = form.accept_conditions.as_deref() == Some("on");
    if !accept {
        let ctx = register_template_ctx(
            &turnstile,
            &csrf_token,
            Some("Vous devez accepter les conditions d'utilisation.".into()),
            &form.pseudo,
        );
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
                let _ = session.insert(SITE_USER_ID_SESSION_KEY, u.id);
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
            let ctx = register_template_ctx(&turnstile, &csrf_token, Some(msg), &form.pseudo);
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body))
        }
    }
}
