use actix_session::Session;
use actix_web::{HttpRequest, HttpResponse, get, post, web};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use totp_rs::{Algorithm, Secret, TOTP};
use uuid::Uuid;

use crate::auth::session::SITE_USER_ID_SESSION_KEY;
use crate::auth::user_db::{self, UpdatePasswordError};
use crate::routes::admin::SESSION_KEY_ADMIN_ID;

use super::repository;

const NEUTRAL_FORGOT_MESSAGE: &str =
    "Si un compte correspondant existe, les instructions de reinitialisation ont ete preparees.";

fn ip_as_string(req: &HttpRequest) -> Option<String> {
    req.peer_addr().map(|addr| addr.ip().to_string())
}

fn user_agent_as_string(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("User-Agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
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

fn invalid_request_response() -> HttpResponse {
    HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_request" }))
}

fn is_request_expired(request: &repository::PasswordResetRequest) -> bool {
    request.expires_at <= chrono::Utc::now()
}

fn current_admin_id(session: &Session) -> Option<Uuid> {
    session.get::<Uuid>(SESSION_KEY_ADMIN_ID).ok().flatten()
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordBody {
    pub login: String,
}

#[derive(Debug, Serialize)]
pub struct ForgotPasswordResponse {
    pub message: String,
    pub request_id: Uuid,
}

#[post("/auth/forgot-password")]
pub async fn forgot_password(
    req: HttpRequest,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<ForgotPasswordBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let login = body.login.trim();
    if login.is_empty() {
        return invalid_request_response();
    }
    let mut request_id = Uuid::new_v4();
    match repository::find_site_user_by_login(pool.get_ref(), login).await {
        Ok(Some(user)) => {
            let path = if user.twofa_enabled
                && user
                    .twofa_secret_encrypted
                    .as_ref()
                    .is_some_and(|v| !v.trim().is_empty())
            {
                repository::PATH_TWOFA
            } else {
                repository::PATH_ADMIN
            };
            let status = if path == repository::PATH_TWOFA {
                repository::STATUS_CHALLENGE_READY
            } else {
                repository::STATUS_PENDING
            };
            if let Err(e) = repository::expire_open_requests(pool.get_ref(), user.id).await {
                tracing::error!("forgot_password expire_open_requests: {}", e);
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
            match repository::create_password_reset_request(
                pool.get_ref(),
                user.id,
                path,
                status,
                30,
            )
            .await
            {
                Ok(id) => {
                    request_id = id;
                    let _ = repository::insert_audit_event(
                        pool.get_ref(),
                        "password_reset_requested",
                        "system",
                        None,
                        Some(id),
                        None,
                        ip_as_string(&req).as_deref(),
                        user_agent_as_string(&req).as_deref(),
                        serde_json::json!({ "path": path }),
                    )
                    .await;
                }
                Err(e) => {
                    tracing::error!("forgot_password create_password_reset_request: {}", e);
                    return HttpResponse::InternalServerError()
                        .json(serde_json::json!({ "error": "database" }));
                }
            }
        }
        Ok(None) => {}
        Err(e) => {
            tracing::error!("forgot_password find_site_user_by_login: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };

    HttpResponse::Ok().json(ForgotPasswordResponse {
        message: NEUTRAL_FORGOT_MESSAGE.to_string(),
        request_id,
    })
}

#[derive(Debug, Deserialize)]
pub struct Verify2faBody {
    pub request_id: Uuid,
    pub totp_code: String,
}

#[post("/auth/reset/verify-2fa")]
pub async fn verify_2fa(
    req: HttpRequest,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<Verify2faBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };

    let request =
        match repository::get_password_reset_request(pool.get_ref(), body.request_id).await {
            Ok(Some(r)) => r,
            Ok(None) => return invalid_request_response(),
            Err(e) => {
                tracing::error!("verify_2fa get_password_reset_request: {}", e);
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
        };
    if request.path != repository::PATH_TWOFA
        || request.status != repository::STATUS_CHALLENGE_READY
        || is_request_expired(&request)
    {
        return invalid_request_response();
    }

    let user = match repository::find_site_user_by_id(pool.get_ref(), request.site_user_id).await {
        Ok(Some(u)) => u,
        Ok(None) => return invalid_request_response(),
        Err(e) => {
            tracing::error!("verify_2fa find_site_user_by_id: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    let Some(secret) = user.twofa_secret_encrypted.as_deref() else {
        return invalid_request_response();
    };
    if !verify_totp(secret, body.totp_code.trim()) {
        let attempts = repository::increment_attempt_count(pool.get_ref(), body.request_id)
            .await
            .unwrap_or(request.attempt_count + 1);
        if attempts >= 5 {
            return HttpResponse::TooManyRequests()
                .json(serde_json::json!({ "error": "too_many_attempts" }));
        }
        return invalid_request_response();
    }
    if let Err(e) = repository::mark_twofa_verified(pool.get_ref(), body.request_id).await {
        tracing::error!("verify_2fa mark_twofa_verified: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let _ = repository::insert_audit_event(
        pool.get_ref(),
        "password_reset_twofa_verified",
        "user",
        Some(request.site_user_id),
        Some(request.id),
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({}),
    )
    .await;
    HttpResponse::NoContent().finish()
}

#[derive(Debug, Deserialize)]
pub struct VerifyRecoveryCodeBody {
    pub request_id: Uuid,
    pub recovery_code: String,
}

#[post("/auth/reset/verify-recovery-code")]
pub async fn verify_recovery_code(
    req: HttpRequest,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<VerifyRecoveryCodeBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let request =
        match repository::get_password_reset_request(pool.get_ref(), body.request_id).await {
            Ok(Some(r)) => r,
            Ok(None) => return invalid_request_response(),
            Err(e) => {
                tracing::error!("verify_recovery_code get_password_reset_request: {}", e);
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
        };
    if request.path != repository::PATH_TWOFA
        || request.twofa_verified_at.is_none()
        || is_request_expired(&request)
    {
        return invalid_request_response();
    }
    let ok = match repository::consume_recovery_code(
        pool.get_ref(),
        request.site_user_id,
        &hash_code(body.recovery_code.trim()),
    )
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("verify_recovery_code consume_recovery_code: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    if !ok {
        let attempts = repository::increment_attempt_count(pool.get_ref(), body.request_id)
            .await
            .unwrap_or(request.attempt_count + 1);
        if attempts >= 5 {
            return HttpResponse::TooManyRequests()
                .json(serde_json::json!({ "error": "too_many_attempts" }));
        }
        return invalid_request_response();
    }
    if let Err(e) = repository::mark_recovery_verified(pool.get_ref(), body.request_id).await {
        tracing::error!("verify_recovery_code mark_recovery_verified: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let _ = repository::insert_audit_event(
        pool.get_ref(),
        "password_reset_recovery_verified",
        "user",
        Some(request.site_user_id),
        Some(request.id),
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({}),
    )
    .await;
    HttpResponse::NoContent().finish()
}

#[derive(Debug, Deserialize)]
pub struct VerifyTempCodeBody {
    pub request_id: Uuid,
    pub temp_code: String,
}

#[post("/auth/reset/verify-temp-code")]
pub async fn verify_temp_code(
    req: HttpRequest,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<VerifyTempCodeBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let request =
        match repository::get_password_reset_request(pool.get_ref(), body.request_id).await {
            Ok(Some(r)) => r,
            Ok(None) => return invalid_request_response(),
            Err(e) => {
                tracing::error!("verify_temp_code get_password_reset_request: {}", e);
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
        };
    if request.path != repository::PATH_ADMIN
        || request.status != repository::STATUS_TEMP_CODE_ISSUED
        || is_request_expired(&request)
    {
        return invalid_request_response();
    }
    let ok = match repository::consume_temporary_code(
        pool.get_ref(),
        request.id,
        &hash_code(body.temp_code.trim()),
    )
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("verify_temp_code consume_temporary_code: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    if !ok {
        let attempts = repository::increment_attempt_count(pool.get_ref(), body.request_id)
            .await
            .unwrap_or(request.attempt_count + 1);
        if attempts >= 3 {
            return HttpResponse::TooManyRequests()
                .json(serde_json::json!({ "error": "too_many_attempts" }));
        }
        return invalid_request_response();
    }
    if let Err(e) = repository::mark_temp_code_verified(pool.get_ref(), request.id).await {
        tracing::error!("verify_temp_code mark_temp_code_verified: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let _ = repository::insert_audit_event(
        pool.get_ref(),
        "password_reset_temp_code_verified",
        "user",
        Some(request.site_user_id),
        Some(request.id),
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({}),
    )
    .await;
    HttpResponse::NoContent().finish()
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordBody {
    pub request_id: Uuid,
    pub new_password: String,
}

#[post("/auth/reset-password")]
pub async fn reset_password(
    req: HttpRequest,
    session: Session,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<ResetPasswordBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let request =
        match repository::get_password_reset_request(pool.get_ref(), body.request_id).await {
            Ok(Some(r)) => r,
            Ok(None) => return invalid_request_response(),
            Err(e) => {
                tracing::error!("reset_password get_password_reset_request: {}", e);
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
        };
    if is_request_expired(&request) || request.status == repository::STATUS_PASSWORD_RESET_DONE {
        return invalid_request_response();
    }
    let challenge_passed = if request.path == repository::PATH_TWOFA {
        request.twofa_verified_at.is_some() && request.recovery_verified_at.is_some()
    } else if request.path == repository::PATH_ADMIN {
        request.temp_code_verified_at.is_some()
    } else {
        false
    };
    if !challenge_passed {
        return invalid_request_response();
    }
    match user_db::update_password(
        pool.get_ref(),
        request.site_user_id,
        body.new_password.trim(),
    )
    .await
    {
        Ok(()) => {}
        Err(UpdatePasswordError::Password(e)) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({ "error": "password_policy", "message": e.to_string() }));
        }
        Err(UpdatePasswordError::Hash | UpdatePasswordError::Db(_)) => {
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    }
    let user = match repository::find_site_user_by_id(pool.get_ref(), request.site_user_id).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("reset_password find_site_user_by_id: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    let must_force_2fa = user.as_ref().is_some_and(|u| !u.twofa_enabled);
    if let Err(e) = repository::set_force_enable_2fa_after_reset(
        pool.get_ref(),
        request.site_user_id,
        must_force_2fa,
    )
    .await
    {
        tracing::error!("reset_password set_force_enable_2fa_after_reset: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    if let Err(e) = repository::complete_password_reset(pool.get_ref(), request.id).await {
        tracing::error!("reset_password complete_password_reset: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    session.purge();
    let _ = repository::insert_audit_event(
        pool.get_ref(),
        "password_reset_completed",
        "user",
        Some(request.site_user_id),
        Some(request.id),
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({
            "session_revocation_scope": "current_session_only"
        }),
    )
    .await;
    HttpResponse::NoContent().finish()
}

#[derive(Debug, Deserialize)]
pub struct SupportResetRequestBody {
    pub login: String,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SupportResetRequestResponse {
    pub ticket_id: Uuid,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct SupportRequestStatusResponse {
    pub request_id: Uuid,
    pub status: String,
    pub path: String,
    pub expires_at: String,
    pub created_at: String,
}

#[post("/support/password-reset-request")]
pub async fn support_password_reset_request(
    req: HttpRequest,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<SupportResetRequestBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let mut ticket_id = Uuid::new_v4();
    let login = body.login.trim();
    if login.is_empty() {
        return invalid_request_response();
    }
    if let Ok(Some(user)) = repository::find_site_user_by_login(pool.get_ref(), login).await {
        if !user.twofa_enabled {
            if let Err(e) = repository::expire_open_requests(pool.get_ref(), user.id).await {
                tracing::error!("support_password_reset_request expire_open_requests: {}", e);
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({ "error": "database" }));
            }
            match repository::create_password_reset_request(
                pool.get_ref(),
                user.id,
                repository::PATH_ADMIN,
                repository::STATUS_PENDING,
                60,
            )
            .await
            {
                Ok(id) => {
                    ticket_id = id;
                    let _ = repository::insert_audit_event(
                        pool.get_ref(),
                        "password_reset_support_requested",
                        "user",
                        Some(user.id),
                        Some(id),
                        Some(id),
                        ip_as_string(&req).as_deref(),
                        user_agent_as_string(&req).as_deref(),
                        serde_json::json!({
                            "reason": body.reason.as_deref().unwrap_or("")
                        }),
                    )
                    .await;
                }
                Err(e) => {
                    tracing::error!(
                        "support_password_reset_request create_password_reset_request: {}",
                        e
                    );
                    return HttpResponse::InternalServerError()
                        .json(serde_json::json!({ "error": "database" }));
                }
            }
        }
    }
    HttpResponse::Created().json(SupportResetRequestResponse {
        ticket_id,
        status: "pending".to_string(),
        message: "Demande enregistree. Une verification d'identite en presentiel est requise avant emission du code temporaire.".to_string(),
    })
}

#[get("/support/password-reset-request/{request_id}")]
pub async fn support_password_reset_status(
    pool: Option<web::Data<PgPool>>,
    request_id: web::Path<Uuid>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    match repository::get_password_reset_request(pool.get_ref(), request_id.into_inner()).await {
        Ok(Some(r)) => HttpResponse::Ok().json(SupportRequestStatusResponse {
            request_id: r.id,
            status: r.status,
            path: r.path,
            expires_at: r.expires_at.to_rfc3339(),
            created_at: r.created_at.to_rfc3339(),
        }),
        Ok(None) => invalid_request_response(),
        Err(e) => {
            tracing::error!(
                "support_password_reset_status get_password_reset_request: {}",
                e
            );
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "database" }))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AdminApproveBody {
    pub verification_method: String,
    pub notes: Option<String>,
}

#[post("/password-reset/{request_id}/approve")]
pub async fn admin_approve_password_reset(
    req: HttpRequest,
    session: Session,
    pool: Option<web::Data<PgPool>>,
    request_id: web::Path<Uuid>,
    body: web::Json<AdminApproveBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    if body.verification_method.trim() != "in_person" {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({ "error": "invalid_verification_method" }));
    }
    let request_id = request_id.into_inner();
    let admin_id = current_admin_id(&session);
    match repository::mark_approved_by_admin(pool.get_ref(), request_id, admin_id).await {
        Ok(true) => {
            let _ = repository::insert_audit_event(
                pool.get_ref(),
                "password_reset_admin_approved",
                "admin",
                admin_id,
                Some(request_id),
                Some(request_id),
                ip_as_string(&req).as_deref(),
                user_agent_as_string(&req).as_deref(),
                serde_json::json!({
                    "verification_method": "in_person",
                    "notes": body.notes.as_deref().unwrap_or("")
                }),
            )
            .await;
            HttpResponse::NoContent().finish()
        }
        Ok(false) => invalid_request_response(),
        Err(e) => {
            tracing::error!("admin_approve_password_reset mark_approved_by_admin: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "database" }))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct IssueTempCodeBody {
    pub ttl_minutes: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct IssueTempCodeResponse {
    pub temp_code: String,
    pub expires_at: String,
    pub delivery_channel: String,
}

#[post("/password-reset/{request_id}/issue-temp-code")]
pub async fn admin_issue_temp_code(
    req: HttpRequest,
    session: Session,
    pool: Option<web::Data<PgPool>>,
    request_id: web::Path<Uuid>,
    body: web::Json<IssueTempCodeBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let request_id = request_id.into_inner();
    let request = match repository::get_password_reset_request(pool.get_ref(), request_id).await {
        Ok(Some(r)) => r,
        Ok(None) => return invalid_request_response(),
        Err(e) => {
            tracing::error!("admin_issue_temp_code get_password_reset_request: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    if request.path != repository::PATH_ADMIN
        || request.status != repository::STATUS_APPROVED_BY_ADMIN
        || is_request_expired(&request)
    {
        return invalid_request_response();
    }
    let ttl = body.ttl_minutes.unwrap_or(15).clamp(15, 30);
    let temp_code = generate_human_code(3, 4);
    let admin_id = current_admin_id(&session);
    let expires_at = match repository::issue_temporary_code(
        pool.get_ref(),
        request.id,
        admin_id,
        &hash_code(&temp_code),
        ttl,
    )
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("admin_issue_temp_code issue_temporary_code: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    let _ = repository::insert_audit_event(
        pool.get_ref(),
        "password_reset_temp_code_issued",
        "admin",
        admin_id,
        Some(request.id),
        Some(request.id),
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({
            "ttl_minutes": ttl,
            "delivery_channel": "manual_phone"
        }),
    )
    .await;
    HttpResponse::Created().json(IssueTempCodeResponse {
        temp_code,
        expires_at: expires_at.to_rfc3339(),
        delivery_channel: "manual_phone".to_string(),
    })
}

#[derive(Debug, Serialize)]
pub struct PasswordResetQueueResponse {
    pub items: Vec<PasswordResetQueueItemDto>,
}

#[derive(Debug, Serialize)]
pub struct PasswordResetQueueItemDto {
    pub id: Uuid,
    pub pseudo: String,
    pub path: String,
    pub status: String,
    pub attempt_count: i32,
    pub created_at: String,
    pub expires_at: String,
}

#[get("/password-reset/queue")]
pub async fn admin_password_reset_queue(pool: Option<web::Data<PgPool>>) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    match repository::list_password_reset_queue(pool.get_ref(), 200).await {
        Ok(items) => {
            let items = items
                .into_iter()
                .map(|row| PasswordResetQueueItemDto {
                    id: row.id,
                    pseudo: row.pseudo,
                    path: row.path,
                    status: row.status,
                    attempt_count: row.attempt_count,
                    created_at: row.created_at.to_rfc3339(),
                    expires_at: row.expires_at.to_rfc3339(),
                })
                .collect();
            HttpResponse::Ok().json(PasswordResetQueueResponse { items })
        }
        Err(e) => {
            tracing::error!(
                "admin_password_reset_queue list_password_reset_queue: {}",
                e
            );
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "database" }))
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Setup2faResponse {
    pub secret: String,
    pub otpauth_url: String,
}

#[post("/auth/2fa/setup")]
pub async fn setup_2fa(
    req: HttpRequest,
    session: Session,
    pool: Option<web::Data<PgPool>>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let user_id = match session.get::<Uuid>(SITE_USER_ID_SESSION_KEY).ok().flatten() {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({ "error": "unauthenticated" }));
        }
    };
    let user = match repository::find_site_user_by_id(pool.get_ref(), user_id).await {
        Ok(Some(u)) => u,
        Ok(None) => return invalid_request_response(),
        Err(e) => {
            tracing::error!("setup_2fa find_site_user_by_id: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    let secret = generate_totp_secret_base32(32);
    if let Err(e) = repository::set_user_twofa_secret(pool.get_ref(), user_id, &secret).await {
        tracing::error!("setup_2fa set_user_twofa_secret: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let _ = repository::insert_audit_event(
        pool.get_ref(),
        "profile_twofa_setup_started",
        "user",
        Some(user_id),
        None,
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({ "channel": "enforce" }),
    )
    .await;
    let issuer = "DeckAnalyzer";
    let label = format!("{}:{}", issuer, user.pseudo);
    let otpauth_url = format!(
        "otpauth://totp/{}?secret={}&issuer={}&algorithm=SHA1&digits=6&period=30",
        urlencoding::encode(&label),
        secret,
        issuer
    );
    HttpResponse::Ok().json(Setup2faResponse {
        secret,
        otpauth_url,
    })
}

#[derive(Debug, Deserialize)]
pub struct Enable2faBody {
    pub totp_code: String,
}

#[derive(Debug, Serialize)]
pub struct Enable2faResponse {
    pub recovery_codes: Vec<String>,
}

#[post("/auth/2fa/enable")]
pub async fn enable_2fa(
    req: HttpRequest,
    session: Session,
    pool: Option<web::Data<PgPool>>,
    body: web::Json<Enable2faBody>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({ "error": "database_unavailable" }));
    };
    let user_id = match session.get::<Uuid>(SITE_USER_ID_SESSION_KEY).ok().flatten() {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized()
                .json(serde_json::json!({ "error": "unauthenticated" }));
        }
    };
    let user = match repository::find_site_user_by_id(pool.get_ref(), user_id).await {
        Ok(Some(u)) => u,
        Ok(None) => return invalid_request_response(),
        Err(e) => {
            tracing::error!("enable_2fa find_site_user_by_id: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "database" }));
        }
    };
    let Some(secret) = user.twofa_secret_encrypted.as_deref() else {
        return invalid_request_response();
    };
    if user
        .twofa_setup_expires_at
        .map(|deadline| deadline <= chrono::Utc::now())
        .unwrap_or(true)
    {
        let _ = repository::clear_user_twofa_pending_secret(pool.get_ref(), user_id).await;
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_totp" }));
    }
    if !verify_totp(secret, body.totp_code.trim()) {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "invalid_totp" }));
    }
    let recovery_codes: Vec<String> = (0..10).map(|_| generate_human_code(3, 4)).collect();
    let hashes: Vec<String> = recovery_codes.iter().map(|v| hash_code(v)).collect();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(365);
    if let Err(e) =
        repository::replace_recovery_codes_batch(pool.get_ref(), user_id, &hashes, Some(expires_at))
            .await
    {
        tracing::error!("enable_2fa replace_recovery_codes_batch: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    if let Err(e) = repository::enable_user_twofa(pool.get_ref(), user_id).await {
        tracing::error!("enable_2fa enable_user_twofa: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }
    let _ = repository::insert_audit_event(
        pool.get_ref(),
        "profile_twofa_enabled",
        "user",
        Some(user_id),
        None,
        None,
        ip_as_string(&req).as_deref(),
        user_agent_as_string(&req).as_deref(),
        serde_json::json!({ "channel": "enforce", "recovery_code_count": recovery_codes.len() }),
    )
    .await;
    HttpResponse::Ok().json(Enable2faResponse { recovery_codes })
}

#[get("/mot-de-passe-oublie")]
pub async fn forgot_password_page(tera: web::Data<tera::Tera>, session: Session) -> HttpResponse {
    let csrf_token = match crate::auth::csrf::sync_csrf_token(&session) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("forgot_password_page csrf: {}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    ctx.insert("csrf_token", &csrf_token);
    let user_pseudo: Option<String> = session.get("site_user_pseudo").ok().flatten();
    ctx.insert("user_pseudo", &user_pseudo);
    match tera.render("password_reset.html", &ctx) {
        Ok(body) => HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(body),
        Err(e) => {
            tracing::error!("forgot_password_page render: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/auth/2fa/enforce")]
pub async fn enforce_2fa_page(
    tera: web::Data<tera::Tera>,
    session: Session,
    pool: Option<web::Data<PgPool>>,
) -> HttpResponse {
    let user_id = match session.get::<Uuid>(SITE_USER_ID_SESSION_KEY).ok().flatten() {
        Some(id) => id,
        None => {
            return HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish();
        }
    };
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable().body("Base de données indisponible.");
    };
    let user = match repository::find_site_user_by_id(pool.get_ref(), user_id).await {
        Ok(Some(u)) => u,
        _ => {
            return HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish();
        }
    };
    if !user.force_enable_2fa_after_reset {
        return HttpResponse::SeeOther()
            .append_header(("Location", "/mon-compte"))
            .finish();
    }
    let csrf_token = match crate::auth::csrf::sync_csrf_token(&session) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("enforce_2fa_page csrf: {}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    ctx.insert("csrf_token", &csrf_token);
    let user_pseudo: Option<String> = session.get("site_user_pseudo").ok().flatten();
    ctx.insert("user_pseudo", &user_pseudo);
    ctx.insert("enforce_only", &true);
    match tera.render("password_reset.html", &ctx) {
        Ok(body) => HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(body),
        Err(e) => {
            tracing::error!("enforce_2fa_page render: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[get("/password-reset")]
pub async fn admin_password_reset_page() -> HttpResponse {
    let body = include_str!("../../../templates/admin_inline/password_reset_queue.html");
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body)
}
