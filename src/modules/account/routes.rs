//! Routes HTTP de l'espace personnel.

use std::collections::HashMap;

use actix_session::Session;
use actix_web::{HttpResponse, get, post, web};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::auth::csrf;
use crate::auth::session::{current_user, require_session};
use crate::auth::user_db::{self, UpdatePasswordError};
use crate::modules::account::repository;
use crate::modules::template_error::TemplateError;

#[derive(Debug, serde::Deserialize)]
pub struct ChangePasswordForm {
    pub current_password: String,
    pub new_password: String,
    pub confirm_password: String,
    pub csrf_token: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct DeleteAccountForm {
    pub current_password: String,
    pub confirm_phrase: String,
    pub csrf_token: Option<String>,
}

fn created_at_display(dt: DateTime<Utc>) -> String {
    dt.format("%d/%m/%Y %H:%M UTC").to_string()
}

async fn resolve_current_site_user(
    session: &Session,
    pool: &sqlx::PgPool,
) -> Result<(Uuid, String), HttpResponse> {
    match current_user(session) {
        Ok(u) => Ok(u),
        Err(_) => {
            let pseudo = require_session(session).map_err(|_| {
                HttpResponse::SeeOther()
                    .append_header(("Location", "/"))
                    .finish()
            })?;
            let user = user_db::get_user_by_pseudo(pool, &pseudo)
                .await
                .map_err(|e| {
                    tracing::error!("account resolve user: {}", e);
                    HttpResponse::InternalServerError().finish()
                })?
                .ok_or_else(|| {
                    HttpResponse::SeeOther()
                        .append_header(("Location", "/"))
                        .finish()
                })?;
            Ok((user.id, user.pseudo))
        }
    }
}

fn account_context(
    csrf_token: &str,
    pseudo: &str,
    created_at: Option<DateTime<Utc>>,
    deck_count: Option<i64>,
    password_error: Option<String>,
    password_changed: bool,
    delete_error: Option<String>,
) -> tera::Context {
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", Utc::now().timestamp()));
    ctx.insert("csrf_token", csrf_token);
    ctx.insert("user_pseudo", &Some(pseudo.to_string()));
    ctx.insert("pseudo", pseudo);
    ctx.insert(
        "created_at_display",
        &created_at
            .map(created_at_display)
            .unwrap_or_else(|| "Inconnue".to_string()),
    );
    ctx.insert("deck_count", &deck_count.unwrap_or(0));
    ctx.insert("password_error", &password_error);
    ctx.insert("password_changed", &password_changed);
    ctx.insert("delete_error", &delete_error);
    ctx
}

fn render_account_template(
    tera: &tera::Tera,
    ctx: &tera::Context,
) -> Result<HttpResponse, TemplateError> {
    let body = tera.render("account.html", ctx).map_err(TemplateError)?;
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body))
}

#[get("/mon-compte")]
pub async fn account_page(
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    tera: web::Data<tera::Tera>,
    query: web::Query<HashMap<String, String>>,
) -> Result<HttpResponse, TemplateError> {
    if require_session(&session).is_err() {
        return Ok(HttpResponse::SeeOther()
            .append_header(("Location", "/"))
            .finish());
    }
    let pool = match pool {
        Some(p) => p,
        None => return Ok(HttpResponse::ServiceUnavailable().body("Base de données indisponible.")),
    };
    let (user_id, pseudo) = match resolve_current_site_user(&session, pool.get_ref()).await {
        Ok(u) => u,
        Err(resp) => return Ok(resp),
    };
    let profile = repository::load_profile(pool.get_ref(), user_id)
        .await
        .ok()
        .flatten();
    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (account): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    let password_changed = query.get("password_changed").is_some();
    let profile_pseudo = profile
        .as_ref()
        .map(|p| p.pseudo.clone())
        .unwrap_or(pseudo.clone());
    let created_at = profile.as_ref().map(|p| p.created_at);
    let deck_count = profile.as_ref().map(|p| p.deck_count);
    let ctx = account_context(
        &csrf_token,
        &profile_pseudo,
        created_at,
        deck_count,
        None,
        password_changed,
        None,
    );
    render_account_template(tera.get_ref(), &ctx)
}

#[post("/mon-compte/mot-de-passe")]
pub async fn account_change_password_submit(
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    tera: web::Data<tera::Tera>,
    form: web::Form<ChangePasswordForm>,
) -> Result<HttpResponse, TemplateError> {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return Ok(csrf::csrf_rejected());
    }
    let pool = match pool {
        Some(p) => p,
        None => return Ok(HttpResponse::ServiceUnavailable().body("Base de données indisponible.")),
    };
    let (user_id, pseudo) = match resolve_current_site_user(&session, pool.get_ref()).await {
        Ok(u) => u,
        Err(resp) => return Ok(resp),
    };
    let profile = repository::load_profile(pool.get_ref(), user_id)
        .await
        .ok()
        .flatten();
    if form.new_password != form.confirm_password {
        let csrf_token = match csrf::sync_csrf_token(&session) {
            Ok(t) => t,
            Err(_) => return Ok(HttpResponse::InternalServerError().finish()),
        };
        let ctx = account_context(
            &csrf_token,
            &pseudo,
            profile.as_ref().map(|p| p.created_at),
            profile.as_ref().map(|p| p.deck_count),
            Some("Les deux mots de passe ne correspondent pas.".to_string()),
            false,
            None,
        );
        return render_account_template(tera.get_ref(), &ctx);
    }
    let verified =
        user_db::verify_current_password(pool.get_ref(), user_id, &form.current_password)
            .await
            .unwrap_or(false);
    if !verified {
        let csrf_token = match csrf::sync_csrf_token(&session) {
            Ok(t) => t,
            Err(_) => return Ok(HttpResponse::InternalServerError().finish()),
        };
        let ctx = account_context(
            &csrf_token,
            &pseudo,
            profile.as_ref().map(|p| p.created_at),
            profile.as_ref().map(|p| p.deck_count),
            Some("Impossible de mettre à jour le mot de passe.".to_string()),
            false,
            None,
        );
        return render_account_template(tera.get_ref(), &ctx);
    }
    match user_db::update_password(pool.get_ref(), user_id, &form.new_password).await {
        Ok(()) => {
            csrf::invalidate_csrf_token(&session);
            Ok(HttpResponse::SeeOther()
                .append_header(("Location", "/mon-compte?password_changed=1"))
                .finish())
        }
        Err(e) => {
            let msg = match e {
                UpdatePasswordError::Password(_) => {
                    "Le nouveau mot de passe ne respecte pas les règles de sécurité.".to_string()
                }
                UpdatePasswordError::Hash | UpdatePasswordError::Db(_) => {
                    "Impossible de mettre à jour le mot de passe.".to_string()
                }
            };
            let csrf_token = match csrf::sync_csrf_token(&session) {
                Ok(t) => t,
                Err(_) => return Ok(HttpResponse::InternalServerError().finish()),
            };
            let ctx = account_context(
                &csrf_token,
                &pseudo,
                profile.as_ref().map(|p| p.created_at),
                profile.as_ref().map(|p| p.deck_count),
                Some(msg),
                false,
                None,
            );
            render_account_template(tera.get_ref(), &ctx)
        }
    }
}

#[post("/mon-compte/supprimer")]
pub async fn account_delete_submit(
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    tera: web::Data<tera::Tera>,
    form: web::Form<DeleteAccountForm>,
) -> Result<HttpResponse, TemplateError> {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return Ok(csrf::csrf_rejected());
    }
    let pool = match pool {
        Some(p) => p,
        None => return Ok(HttpResponse::ServiceUnavailable().body("Base de données indisponible.")),
    };
    let (user_id, pseudo) = match resolve_current_site_user(&session, pool.get_ref()).await {
        Ok(u) => u,
        Err(resp) => return Ok(resp),
    };
    let profile = repository::load_profile(pool.get_ref(), user_id)
        .await
        .ok()
        .flatten();

    let verified =
        user_db::verify_current_password(pool.get_ref(), user_id, &form.current_password)
            .await
            .unwrap_or(false);
    let phrase_ok = form.confirm_phrase.trim() == pseudo;
    if !verified || !phrase_ok {
        let csrf_token = match csrf::sync_csrf_token(&session) {
            Ok(t) => t,
            Err(_) => return Ok(HttpResponse::InternalServerError().finish()),
        };
        let ctx = account_context(
            &csrf_token,
            &pseudo,
            profile.as_ref().map(|p| p.created_at),
            profile.as_ref().map(|p| p.deck_count),
            None,
            false,
            Some("Confirmation invalide. Vérifiez le mot de passe et le pseudo.".to_string()),
        );
        return render_account_template(tera.get_ref(), &ctx);
    }
    match user_db::delete_user(pool.get_ref(), user_id).await {
        Ok(true) => {
            session.purge();
            Ok(HttpResponse::SeeOther()
                .append_header(("Location", "/?account_deleted=1"))
                .finish())
        }
        Ok(false) => {
            let csrf_token = match csrf::sync_csrf_token(&session) {
                Ok(t) => t,
                Err(_) => return Ok(HttpResponse::InternalServerError().finish()),
            };
            let ctx = account_context(
                &csrf_token,
                &pseudo,
                profile.as_ref().map(|p| p.created_at),
                profile.as_ref().map(|p| p.deck_count),
                None,
                false,
                Some("Compte introuvable.".to_string()),
            );
            render_account_template(tera.get_ref(), &ctx)
        }
        Err(e) => {
            tracing::error!("delete_user: {}", e);
            let csrf_token = match csrf::sync_csrf_token(&session) {
                Ok(t) => t,
                Err(_) => return Ok(HttpResponse::InternalServerError().finish()),
            };
            let ctx = account_context(
                &csrf_token,
                &pseudo,
                profile.as_ref().map(|p| p.created_at),
                profile.as_ref().map(|p| p.deck_count),
                None,
                false,
                Some("Erreur technique. Réessayez.".to_string()),
            );
            render_account_template(tera.get_ref(), &ctx)
        }
    }
}
