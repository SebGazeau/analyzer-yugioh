use chrono::{DateTime, Duration, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::db::DbError;

pub const PATH_TWOFA: &str = "twofa";
pub const PATH_ADMIN: &str = "admin";

pub const STATUS_PENDING: &str = "pending";
pub const STATUS_CHALLENGE_READY: &str = "challenge_ready";
pub const STATUS_APPROVED_BY_ADMIN: &str = "approved_by_admin";
pub const STATUS_TEMP_CODE_ISSUED: &str = "temp_code_issued";
pub const STATUS_PASSWORD_RESET_DONE: &str = "password_reset_done";
pub const STATUS_EXPIRED: &str = "expired";

#[derive(Debug, Clone, FromRow)]
pub struct ResetUserRow {
    pub id: Uuid,
    pub pseudo: String,
    pub twofa_enabled: bool,
    pub twofa_secret_encrypted: Option<String>,
    pub twofa_setup_expires_at: Option<DateTime<Utc>>,
    pub force_enable_2fa_after_reset: bool,
    pub session_epoch: i64,
}

#[derive(Debug, Clone, FromRow)]
pub struct PasswordResetRequest {
    pub id: Uuid,
    pub site_user_id: Uuid,
    pub path: String,
    pub status: String,
    pub attempt_count: i32,
    pub twofa_verified_at: Option<DateTime<Utc>>,
    pub recovery_verified_at: Option<DateTime<Utc>>,
    pub temp_code_verified_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct PasswordResetQueueItem {
    pub id: Uuid,
    pub pseudo: String,
    pub path: String,
    pub status: String,
    pub attempt_count: i32,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

pub async fn find_site_user_by_login(
    pool: &sqlx::PgPool,
    login: &str,
) -> Result<Option<ResetUserRow>, DbError> {
    let key = login.trim().to_lowercase();
    if key.is_empty() {
        return Ok(None);
    }
    let row = sqlx::query_as::<_, ResetUserRow>(
        r#"
        SELECT id, pseudo, twofa_enabled, twofa_secret_encrypted, twofa_setup_expires_at, force_enable_2fa_after_reset, session_epoch
        FROM site_users
        WHERE LOWER(TRIM(pseudo)) = $1
        "#,
    )
    .bind(key)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn find_site_user_by_id(
    pool: &sqlx::PgPool,
    site_user_id: Uuid,
) -> Result<Option<ResetUserRow>, DbError> {
    let row = sqlx::query_as::<_, ResetUserRow>(
        r#"
        SELECT id, pseudo, twofa_enabled, twofa_secret_encrypted, twofa_setup_expires_at, force_enable_2fa_after_reset, session_epoch
        FROM site_users
        WHERE id = $1
        "#,
    )
    .bind(site_user_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn expire_open_requests(pool: &sqlx::PgPool, site_user_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE password_reset_requests
        SET status = $1, resolved_at = NOW(), updated_at = NOW()
        WHERE site_user_id = $2
          AND status IN ($3, $4, $5, $6)
          AND resolved_at IS NULL
        "#,
    )
    .bind(STATUS_EXPIRED)
    .bind(site_user_id)
    .bind(STATUS_PENDING)
    .bind(STATUS_CHALLENGE_READY)
    .bind(STATUS_APPROVED_BY_ADMIN)
    .bind(STATUS_TEMP_CODE_ISSUED)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn create_password_reset_request(
    pool: &sqlx::PgPool,
    site_user_id: Uuid,
    path: &str,
    status: &str,
    ttl_minutes: i64,
) -> Result<Uuid, DbError> {
    let request_id = Uuid::new_v4();
    let expires_at = Utc::now() + Duration::minutes(ttl_minutes);
    sqlx::query(
        r#"
        INSERT INTO password_reset_requests
            (id, site_user_id, path, status, expires_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, NOW(), NOW())
        "#,
    )
    .bind(request_id)
    .bind(site_user_id)
    .bind(path)
    .bind(status)
    .bind(expires_at)
    .execute(pool)
    .await?;
    Ok(request_id)
}

pub async fn get_password_reset_request(
    pool: &sqlx::PgPool,
    request_id: Uuid,
) -> Result<Option<PasswordResetRequest>, DbError> {
    let row = sqlx::query_as::<_, PasswordResetRequest>(
        r#"
        SELECT id, site_user_id, path, status, attempt_count,
               twofa_verified_at, recovery_verified_at, temp_code_verified_at, created_at, expires_at
        FROM password_reset_requests
        WHERE id = $1
        "#,
    )
    .bind(request_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn increment_attempt_count(
    pool: &sqlx::PgPool,
    request_id: Uuid,
) -> Result<i32, DbError> {
    let row: (i32,) = sqlx::query_as(
        r#"
        UPDATE password_reset_requests
        SET attempt_count = attempt_count + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING attempt_count
        "#,
    )
    .bind(request_id)
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

pub async fn mark_twofa_verified(pool: &sqlx::PgPool, request_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE password_reset_requests
        SET twofa_verified_at = NOW(), updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(request_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn consume_recovery_code(
    pool: &sqlx::PgPool,
    site_user_id: Uuid,
    code_hash: &str,
) -> Result<bool, DbError> {
    let row = sqlx::query(
        r#"
        UPDATE recovery_codes
        SET used_at = NOW()
        WHERE site_user_id = $1
          AND code_hash = $2
          AND used_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        "#,
    )
    .bind(site_user_id)
    .bind(code_hash)
    .execute(pool)
    .await?;
    Ok(row.rows_affected() > 0)
}

pub async fn mark_recovery_verified(pool: &sqlx::PgPool, request_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE password_reset_requests
        SET recovery_verified_at = NOW(), updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(request_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn mark_approved_by_admin(
    pool: &sqlx::PgPool,
    request_id: Uuid,
    admin_user_id: Option<Uuid>,
) -> Result<bool, DbError> {
    let row = sqlx::query(
        r#"
        UPDATE password_reset_requests
        SET status = $1, approved_by_admin_user_id = $2, updated_at = NOW()
        WHERE id = $3
          AND path = $4
          AND status = $5
          AND expires_at > NOW()
        "#,
    )
    .bind(STATUS_APPROVED_BY_ADMIN)
    .bind(admin_user_id)
    .bind(request_id)
    .bind(PATH_ADMIN)
    .bind(STATUS_PENDING)
    .execute(pool)
    .await?;
    Ok(row.rows_affected() > 0)
}

pub async fn issue_temporary_code(
    pool: &sqlx::PgPool,
    request_id: Uuid,
    issued_by_admin_user_id: Option<Uuid>,
    code_hash: &str,
    ttl_minutes: i64,
) -> Result<DateTime<Utc>, DbError> {
    let expires_at = Utc::now() + Duration::minutes(ttl_minutes);
    sqlx::query(
        r#"
        INSERT INTO temporary_recovery_codes
            (id, password_reset_request_id, code_hash, issued_by_admin_user_id, delivery_channel, expires_at, created_at)
        VALUES
            ($1, $2, $3, $4, 'manual_phone', $5, NOW())
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(request_id)
    .bind(code_hash)
    .bind(issued_by_admin_user_id)
    .bind(expires_at)
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        UPDATE password_reset_requests
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        "#,
    )
    .bind(STATUS_TEMP_CODE_ISSUED)
    .bind(request_id)
    .execute(pool)
    .await?;
    Ok(expires_at)
}

pub async fn consume_temporary_code(
    pool: &sqlx::PgPool,
    request_id: Uuid,
    code_hash: &str,
) -> Result<bool, DbError> {
    let row = sqlx::query(
        r#"
        UPDATE temporary_recovery_codes
        SET used_at = NOW()
        WHERE password_reset_request_id = $1
          AND code_hash = $2
          AND used_at IS NULL
          AND expires_at > NOW()
        "#,
    )
    .bind(request_id)
    .bind(code_hash)
    .execute(pool)
    .await?;
    Ok(row.rows_affected() > 0)
}

pub async fn mark_temp_code_verified(pool: &sqlx::PgPool, request_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE password_reset_requests
        SET temp_code_verified_at = NOW(), status = $1, updated_at = NOW()
        WHERE id = $2
        "#,
    )
    .bind(STATUS_CHALLENGE_READY)
    .bind(request_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn complete_password_reset(pool: &sqlx::PgPool, request_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE password_reset_requests
        SET status = $1, resolved_at = NOW(), updated_at = NOW()
        WHERE id = $2
        "#,
    )
    .bind(STATUS_PASSWORD_RESET_DONE)
    .bind(request_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn set_force_enable_2fa_after_reset(
    pool: &sqlx::PgPool,
    site_user_id: Uuid,
    required: bool,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE site_users
        SET force_enable_2fa_after_reset = $1,
            twofa_enforced_at = CASE WHEN $1 THEN NOW() ELSE NULL END
        WHERE id = $2
        "#,
    )
    .bind(required)
    .bind(site_user_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn set_user_twofa_secret(
    pool: &sqlx::PgPool,
    site_user_id: Uuid,
    secret_base32: &str,
) -> Result<(), DbError> {
    let setup_expires_at = Utc::now() + Duration::minutes(10);
    sqlx::query(
        r#"
        UPDATE site_users
        SET twofa_secret_encrypted = $1,
            twofa_enabled = FALSE,
            twofa_setup_expires_at = $2
        WHERE id = $3
        "#,
    )
    .bind(secret_base32)
    .bind(setup_expires_at)
    .bind(site_user_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn clear_user_twofa_pending_secret(
    pool: &sqlx::PgPool,
    site_user_id: Uuid,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE site_users
        SET twofa_secret_encrypted = NULL,
            twofa_setup_expires_at = NULL
        WHERE id = $1
        "#,
    )
    .bind(site_user_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn enable_user_twofa(pool: &sqlx::PgPool, site_user_id: Uuid) -> Result<(), DbError> {
    sqlx::query(
        r#"
        UPDATE site_users
        SET twofa_enabled = TRUE,
            twofa_setup_expires_at = NULL,
            force_enable_2fa_after_reset = FALSE,
            twofa_enforced_at = NULL
        WHERE id = $1
        "#,
    )
    .bind(site_user_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn replace_recovery_codes_batch(
    pool: &sqlx::PgPool,
    site_user_id: Uuid,
    code_hashes: &[String],
    expires_at: Option<DateTime<Utc>>,
) -> Result<Uuid, DbError> {
    let batch_id = Uuid::new_v4();
    sqlx::query(
        "UPDATE recovery_codes SET used_at = NOW() WHERE site_user_id = $1 AND used_at IS NULL",
    )
    .bind(site_user_id)
    .execute(pool)
    .await?;
    for code_hash in code_hashes {
        sqlx::query(
            r#"
            INSERT INTO recovery_codes (id, site_user_id, code_hash, batch_id, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(site_user_id)
        .bind(code_hash)
        .bind(batch_id)
        .bind(expires_at)
        .execute(pool)
        .await?;
    }
    Ok(batch_id)
}

pub async fn list_password_reset_queue(
    pool: &sqlx::PgPool,
    limit: i64,
) -> Result<Vec<PasswordResetQueueItem>, DbError> {
    let rows = sqlx::query_as::<_, PasswordResetQueueItem>(
        r#"
        SELECT r.id, u.pseudo, r.path, r.status, r.attempt_count, r.created_at, r.expires_at
        FROM password_reset_requests r
        JOIN site_users u ON u.id = r.site_user_id
        ORDER BY r.created_at DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn insert_audit_event(
    pool: &sqlx::PgPool,
    event_type: &str,
    actor_type: &str,
    actor_id: Option<Uuid>,
    request_id: Option<Uuid>,
    ticket_id: Option<Uuid>,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
    metadata: serde_json::Value,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO security_audit_events
            (id, event_type, actor_type, actor_id, password_reset_request_id, ticket_id, ip_address, user_agent, metadata_json, created_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(event_type)
    .bind(actor_type)
    .bind(actor_id)
    .bind(request_id)
    .bind(ticket_id)
    .bind(ip_address)
    .bind(user_agent)
    .bind(metadata)
    .execute(pool)
    .await?;
    Ok(())
}
