//! Persistance SQL — votes Fidraulis GY + passcodes validés admin.

use sqlx::PgPool;
use uuid::Uuid;

/// PostgreSQL `undefined_table` (`42P01`).
pub fn sqlx_is_undefined_table(err: &sqlx::Error) -> bool {
    match err {
        sqlx::Error::Database(db) => db.code().as_deref() == Some("42P01"),
        _ => false,
    }
}

pub async fn list_validated_passcodes(pool: &PgPool) -> Result<Vec<i64>, sqlx::Error> {
    sqlx::query_scalar::<_, i64>(
        "SELECT passcode FROM insight_fidraulis_gy_admin_validated_passcode ORDER BY passcode ASC",
    )
    .fetch_all(pool)
    .await
}

pub async fn load_validated_passcodes_set(
    pool: &PgPool,
) -> Result<std::collections::HashSet<i64>, sqlx::Error> {
    let v = list_validated_passcodes(pool).await?;
    Ok(v.into_iter().collect())
}

pub async fn is_passcode_admin_validated(
    pool: &PgPool,
    passcode: i64,
) -> Result<bool, sqlx::Error> {
    let r: Option<(bool,)> = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM insight_fidraulis_gy_admin_validated_passcode WHERE passcode = $1)",
    )
    .bind(passcode)
    .fetch_optional(pool)
    .await?;
    Ok(r.map(|x| x.0).unwrap_or(false))
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct VoteStateRow {
    pub passcode: i64,
    pub admin_locked: bool,
    pub user_verdict: Option<String>,
}

pub async fn vote_state_for_user(
    pool: &PgPool,
    site_user_id: Uuid,
    passcodes: &[i64],
) -> Result<Vec<VoteStateRow>, sqlx::Error> {
    if passcodes.is_empty() {
        return Ok(Vec::new());
    }
    let mut out = Vec::with_capacity(passcodes.len());
    for &pc in passcodes {
        let admin_locked = is_passcode_admin_validated(pool, pc).await?;
        let user_verdict: Option<String> = sqlx::query_scalar(
            "SELECT verdict FROM insight_fidraulis_gy_user_vote WHERE site_user_id = $1 AND passcode = $2",
        )
        .bind(site_user_id)
        .bind(pc)
        .fetch_optional(pool)
        .await?;
        out.push(VoteStateRow {
            passcode: pc,
            admin_locked,
            user_verdict,
        });
    }
    Ok(out)
}

pub fn is_unique_violation(err: &sqlx::Error) -> bool {
    match err {
        sqlx::Error::Database(db) => db.code().as_deref() == Some("23505"),
        _ => false,
    }
}

pub async fn insert_user_vote(
    pool: &PgPool,
    site_user_id: Uuid,
    passcode: i64,
    verdict: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO insight_fidraulis_gy_user_vote (site_user_id, passcode, verdict)
           VALUES ($1, $2, $3)"#,
    )
    .bind(site_user_id)
    .bind(passcode)
    .bind(verdict)
    .execute(pool)
    .await?;
    Ok(())
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AdminQueueRow {
    pub passcode: i64,
    pub approves: i64,
    pub rejects: i64,
    pub score: i64,
}

pub async fn list_admin_vote_queue(pool: &PgPool) -> Result<Vec<AdminQueueRow>, sqlx::Error> {
    sqlx::query_as::<_, AdminQueueRow>(
        r#"SELECT v.passcode,
                  COUNT(*) FILTER (WHERE v.verdict = 'approve')::bigint AS approves,
                  COUNT(*) FILTER (WHERE v.verdict = 'reject')::bigint AS rejects,
                  (COUNT(*) FILTER (WHERE v.verdict = 'approve')
                   - COUNT(*) FILTER (WHERE v.verdict = 'reject'))::bigint AS score
             FROM insight_fidraulis_gy_user_vote v
            WHERE NOT EXISTS (
                      SELECT 1 FROM insight_fidraulis_gy_admin_validated_passcode a
                      WHERE a.passcode = v.passcode
                  )
            GROUP BY v.passcode
            ORDER BY score DESC, v.passcode ASC"#,
    )
    .fetch_all(pool)
    .await
}

pub async fn insert_admin_validated(
    pool: &PgPool,
    passcode: i64,
    admin_user_id: Option<Uuid>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO insight_fidraulis_gy_admin_validated_passcode (passcode, admin_user_id)
           VALUES ($1, $2)
           ON CONFLICT (passcode) DO NOTHING"#,
    )
    .bind(passcode)
    .bind(admin_user_id)
    .execute(pool)
    .await?;
    Ok(())
}
