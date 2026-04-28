//! Routes HTTP de l'espace personnel.

use std::collections::HashMap;

use actix_session::Session;
use actix_web::{HttpRequest, HttpResponse, get, post, web};
use chrono::{DateTime, Utc};
use rand_core::{OsRng, RngCore};
use sha2::{Digest, Sha256};
use totp_rs::{Algorithm, Secret, TOTP};
use uuid::Uuid;

use crate::auth::csrf;
use crate::auth::session::{SITE_USER_SESSION_EPOCH_KEY, current_user, require_session};
use crate::auth::user_db::{self, UpdatePasswordError};
use crate::modules::account::repository;
use crate::modules::password_reset::repository as reset_repository;
use crate::modules::template_error::TemplateError;

const TWOFA_SETUP_TTL_MINUTES: i64 = 10;

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

#[derive(Debug, serde::Deserialize)]
pub struct ProfileSetup2faBody {
    pub current_password: String,
    pub csrf_token: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct ProfileEnable2faBody {
    pub current_password: String,
    pub totp_code: String,
    pub csrf_token: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct ProfileRotateRecoveryCodesBody {
    pub current_password: String,
    pub csrf_token: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct ProfileSetup2faResponse {
    pub secret: String,
    pub otpauth_url: String,
    pub setup_expires_at: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ProfileRecoveryCodesResponse {
    pub recovery_codes: Vec<String>,
}

fn created_at_display(dt: DateTime<Utc>) -> String {
    dt.format("%d/%m/%Y %H:%M UTC").to_string()
}

fn ip_as_string(req: &HttpRequest) -> Option<String> {
    req.peer_addr().map(|addr| addr.ip().to_string())
}

fn user_agent_as_string(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("User-Agent")
        .and_then(|v| v.to_str().ok())
        .map(ToString::to_string)
}

fn hash_code(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn generate_human_code(groups: usize, group_len: usize) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = OsRng;
    let mut out = String::new();
    for g in 0..groups {
        if g > 0 {
            out.push('-');
        }
        for _ in 0..group_len {
            let idx = (rng.next_u32() as usize) % ALPHABET.len();
            out.push(ALPHABET[idx] as char);
        }
    }
    out
}

fn generate_totp_secret_base32(len: usize) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut rng = OsRng;
    let mut out = String::new();
    for _ in 0..len {
        let idx = (rng.next_u32() as usize) % ALPHABET.len();
        out.push(ALPHABET[idx] as char);
    }
    out
}

fn verify_totp(secret_encoded: &str, code: &str) -> bool {
    if code.len() != 6 || !code.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    let Ok(secret_bytes) = Secret::Encoded(secret_encoded.to_string()).to_bytes() else {
        return false;
    };
    let Ok(totp) = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret_bytes) else {
        return false;
    };
    totp.check_current(code).unwrap_or(false)
}

async fn resolve_current_site_user(
    session: &Session,
    pool: &sqlx::PgPool,
) -> Result<(Uuid, String), HttpResponse> {
    let user_id = match current_user(session) {
        Ok((uid, _)) => uid,
        Err(_) => {
            let pseudo = require_session(session).map_err(|_| {
                HttpResponse::SeeOther()
                    .append_header(("Location", "/"))
                    .finish()
            })?;
            let user = user_db::get_user_by_pseudo(pool, &pseudo)
                .await
                .map_err(|e| {
                    tracing::error!("account resolve user by pseudo: {}", e);
                    HttpResponse::InternalServerError().finish()
                })?
                .ok_or_else(|| {
                    HttpResponse::SeeOther()
                        .append_header(("Location", "/"))
                        .finish()
                })?;
            user.id
        }
    };
    let user = user_db::get_user_by_id(pool, user_id)
        .await
        .map_err(|e| {
            tracing::error!("account resolve user by id: {}", e);
            HttpResponse::InternalServerError().finish()
        })?
        .ok_or_else(|| {
            HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish()
        })?;
    let session_epoch = session
        .get::<i64>(SITE_USER_SESSION_EPOCH_KEY)
        .ok()
        .flatten()
        .unwrap_or_default();
    if session_epoch != user.session_epoch {
        return Err(HttpResponse::SeeOther()
            .append_header(("Location", "/?login_error=1"))
            .finish());
    }
    if user.force_enable_2fa_after_reset {
        return Err(HttpResponse::SeeOther()
            .append_header(("Location", "/auth/2fa/enforce"))
            .finish());
    }
    Ok((user.id, user.pseudo))
}

fn account_context(
    csrf_token: &str,
    pseudo: &str,
    created_at: Option<DateTime<Utc>>,
    deck_count: Option<i64>,
    password_error: Option<String>,
    password_changed: bool,
    delete_error: Option<String>,
    twofa_enabled: bool,
    twofa_setup_pending: bool,
    twofa_setup_expires_at: Option<String>,
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
    ctx.insert("twofa_enabled", &twofa_enabled);
    ctx.insert("twofa_setup_pending", &twofa_setup_pending);
    ctx.insert("twofa_setup_expires_at", &twofa_setup_expires_at);
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

async fn load_twofa_ui_state(pool: &sqlx::PgPool, user_id: Uuid) -> (bool, bool, Option<String>) {
    let user = match user_db::get_user_by_id(pool, user_id).await {
        Ok(v) => v,
        Err(_) => None,
    };
    let twofa_enabled = user.as_ref().is_some_and(|u| u.twofa_enabled);
    let twofa_setup_pending = user.as_ref().is_some_and(|u| {
        !u.twofa_enabled
            && u.twofa_secret_encrypted
                .as_ref()
                .is_some_and(|v| !v.trim().is_empty())
            && u.twofa_setup_expires_at.is_some_and(|ts| ts > Utc::now())
    });
    let twofa_setup_expires_at = user
        .as_ref()
        .and_then(|u| u.twofa_setup_expires_at)
        .map(|v| v.to_rfc3339());
    (twofa_enabled, twofa_setup_pending, twofa_setup_expires_at)
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
    let (twofa_enabled, twofa_setup_pending, twofa_setup_expires_at) =
        load_twofa_ui_state(pool.get_ref(), user_id).await;
    let ctx = account_context(
        &csrf_token,
        &profile_pseudo,
        created_at,
        deck_count,
        None,
        password_changed,
        None,
        twofa_enabled,
        twofa_setup_pending,
        twofa_setup_expires_at,
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
    let (twofa_enabled, twofa_setup_pending, twofa_setup_expires_at) =
        load_twofa_ui_state(pool.get_ref(), user_id).await;
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
            twofa_enabled,
            twofa_setup_pending,
            twofa_setup_expires_at.clone(),
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
            twofa_enabled,
            twofa_setup_pending,
            twofa_setup_expires_at.clone(),
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
                twofa_enabled,
                twofa_setup_pending,
                twofa_setup_expires_at.clone(),
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
    let (twofa_enabled, twofa_setup_pending, twofa_setup_expires_at) =
        load_twofa_ui_state(pool.get_ref(), user_id).await;

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
            twofa_enabled,
            twofa_setup_pending,
            twofa_setup_expires_at.clone(),
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
                twofa_enabled,
                twofa_setup_pending,
                twofa_setup_expires_at.clone(),
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
                twofa_enabled,
                twofa_setup_pending,
                twofa_setup_expires_at.clone(),
            );
            render_account_template(tera.get_ref(), &ctx)
        }
    }
}

#[post("/mon-compte/2fa/setup")]
pub async fn account_twofa_setup(
    req: HttpRequest,
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    body: web::Json<ProfileSetup2faBody>,
) -> HttpResponse {
    let user_id = match current_user(&session) {
        Ok((id, _)) => id,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({ "error": "unauthenticated" }));
        }
    };
    if !csrf::verify_csrf_token(&session, body.csrf_token.as_deref()) {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "invalid_credentials" }));
    }
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable().json(serde_json::json!({ "error": "database" }));
    };
    let verified =
        match user_db::verify_current_password(pool.get_ref(), user_id, &body.current_password)
            .await
        {
            Ok(v) => v,
            Err(_) => {
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
        };
    if !verified {
        return HttpResponse::Unauthorized()
            .json(serde_json::json!({ "error": "invalid_credentials" }));
    }
    let user = match user_db::get_user_by_id(pool.get_ref(), user_id).await {
        Ok(Some(v)) => v,
        Ok(None) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "invalid_credentials" }));
        }
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    let secret = generate_totp_secret_base32(32);
    if let Err(_) = reset_repository::set_user_twofa_secret(pool.get_ref(), user_id, &secret).await
    {
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let setup_expires_at =
        (Utc::now() + chrono::Duration::minutes(TWOFA_SETUP_TTL_MINUTES)).to_rfc3339();
    let issuer = "DeckAnalyzer";
    let label = format!("{}:{}", issuer, user.pseudo);
    let otpauth_url = format!(
        "otpauth://totp/{}?secret={}&issuer={}&algorithm=SHA1&digits=6&period=30",
        urlencoding::encode(&label),
        secret,
        issuer
    );
    let _ = reset_repository::insert_audit_event(
        pool.get_ref(),
        "profile_twofa_setup_started",
        "user",
        Some(user_id),
        None,
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({ "setup_expires_at": setup_expires_at }),
    )
    .await;
    HttpResponse::Ok().json(ProfileSetup2faResponse {
        secret,
        otpauth_url,
        setup_expires_at,
    })
}

#[post("/mon-compte/2fa/enable")]
pub async fn account_twofa_enable(
    req: HttpRequest,
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    body: web::Json<ProfileEnable2faBody>,
) -> HttpResponse {
    let user_id = match current_user(&session) {
        Ok((id, _)) => id,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({ "error": "unauthenticated" }));
        }
    };
    if !csrf::verify_csrf_token(&session, body.csrf_token.as_deref()) {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "invalid_credentials" }));
    }
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable().json(serde_json::json!({ "error": "database" }));
    };
    let verified =
        match user_db::verify_current_password(pool.get_ref(), user_id, &body.current_password)
            .await
        {
            Ok(v) => v,
            Err(_) => {
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
        };
    if !verified {
        return HttpResponse::Unauthorized()
            .json(serde_json::json!({ "error": "invalid_credentials" }));
    }
    let user = match user_db::get_user_by_id(pool.get_ref(), user_id).await {
        Ok(Some(v)) => v,
        Ok(None) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "invalid_credentials" }));
        }
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    let now = Utc::now();
    let Some(secret) = user.twofa_secret_encrypted.as_deref() else {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_totp" }));
    };
    if user
        .twofa_setup_expires_at
        .map(|deadline| deadline <= now)
        .unwrap_or(true)
    {
        let _ = reset_repository::clear_user_twofa_pending_secret(pool.get_ref(), user_id).await;
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_totp" }));
    }
    if !verify_totp(secret, body.totp_code.trim()) {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_totp" }));
    }
    let recovery_codes: Vec<String> = (0..10).map(|_| generate_human_code(3, 4)).collect();
    let hashes: Vec<String> = recovery_codes.iter().map(|v| hash_code(v)).collect();
    let expires_at = Utc::now() + chrono::Duration::days(365);
    if let Err(_) = reset_repository::replace_recovery_codes_batch(
        pool.get_ref(),
        user_id,
        &hashes,
        Some(expires_at),
    )
    .await
    {
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    if let Err(_) = reset_repository::enable_user_twofa(pool.get_ref(), user_id).await {
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let _ = reset_repository::insert_audit_event(
        pool.get_ref(),
        "profile_twofa_enabled",
        "user",
        Some(user_id),
        None,
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({ "recovery_code_count": recovery_codes.len() }),
    )
    .await;
    HttpResponse::Ok().json(ProfileRecoveryCodesResponse { recovery_codes })
}

#[post("/mon-compte/2fa/recovery-codes/rotate")]
pub async fn account_twofa_rotate_recovery_codes(
    req: HttpRequest,
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    body: web::Json<ProfileRotateRecoveryCodesBody>,
) -> HttpResponse {
    let user_id = match current_user(&session) {
        Ok((id, _)) => id,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({ "error": "unauthenticated" }));
        }
    };
    if !csrf::verify_csrf_token(&session, body.csrf_token.as_deref()) {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({ "error": "invalid_credentials" }));
    }
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable().json(serde_json::json!({ "error": "database" }));
    };
    let verified =
        match user_db::verify_current_password(pool.get_ref(), user_id, &body.current_password)
            .await
        {
            Ok(v) => v,
            Err(_) => {
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
        };
    if !verified {
        return HttpResponse::Unauthorized()
            .json(serde_json::json!({ "error": "invalid_credentials" }));
    }
    let user = match user_db::get_user_by_id(pool.get_ref(), user_id).await {
        Ok(Some(v)) => v,
        Ok(None) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "invalid_credentials" }));
        }
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    if !user.twofa_enabled {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_request" }));
    }
    let recovery_codes: Vec<String> = (0..10).map(|_| generate_human_code(3, 4)).collect();
    let hashes: Vec<String> = recovery_codes.iter().map(|v| hash_code(v)).collect();
    let expires_at = Utc::now() + chrono::Duration::days(365);
    if let Err(_) = reset_repository::replace_recovery_codes_batch(
        pool.get_ref(),
        user_id,
        &hashes,
        Some(expires_at),
    )
    .await
    {
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let _ = reset_repository::insert_audit_event(
        pool.get_ref(),
        "profile_twofa_recovery_codes_rotated",
        "user",
        Some(user_id),
        None,
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({ "recovery_code_count": recovery_codes.len() }),
    )
    .await;
    HttpResponse::Ok().json(ProfileRecoveryCodesResponse { recovery_codes })
}
