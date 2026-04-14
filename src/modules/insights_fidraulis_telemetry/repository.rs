//! Persistance SQL télémétrie Fidraulis.

use sqlx::PgPool;
use uuid::Uuid;

use super::fingerprint::RULE_VERSION;

/// PostgreSQL `undefined_table` (`42P01`) — tables télémétrie absentes (migrations non appliquées).
pub fn sqlx_is_undefined_table(err: &sqlx::Error) -> bool {
    match err {
        sqlx::Error::Database(db) => db.code().as_deref() == Some("42P01"),
        _ => false,
    }
}

pub async fn deck_owned_by_user(
    pool: &PgPool,
    deck_id: i32,
    site_user_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let r: Option<(bool,)> =
        sqlx::query_as("SELECT EXISTS(SELECT 1 FROM decks WHERE id = $1 AND site_user_id = $2)")
            .bind(deck_id)
            .bind(site_user_id)
            .fetch_optional(pool)
            .await?;
    Ok(r.map(|x| x.0).unwrap_or(false))
}

pub async fn get_last_fingerprint(
    pool: &PgPool,
    site_user_id: Uuid,
    deck_id: i32,
) -> Result<Option<String>, sqlx::Error> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT fingerprint FROM insight_fidraulis_deck_last_sync WHERE site_user_id = $1 AND deck_id = $2")
            .bind(site_user_id)
            .bind(deck_id)
            .fetch_optional(pool)
            .await?;
    Ok(row.map(|x| x.0))
}

/// Applique les incréments d’une sauvegarde validée (transaction).
pub async fn apply_telemetry_increments(
    pool: &PgPool,
    site_user_id: Uuid,
    deck_id: i32,
    fingerprint: &str,
    cooccurrence: &[i64],
    synergy_verified: &[i64],
    synergy_heuristic: &[i64],
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    for &p in cooccurrence {
        sqlx::query(
            r#"INSERT INTO insight_fidraulis_passcode_stats (passcode, rule_version, cooccurrence_extra_with_fid, synergy_verified_pass, synergy_heuristic_pass, first_seen_at, last_seen_at)
               VALUES ($1, $2, 1, 0, 0, NOW(), NOW())
               ON CONFLICT (passcode, rule_version) DO UPDATE SET
                 cooccurrence_extra_with_fid = insight_fidraulis_passcode_stats.cooccurrence_extra_with_fid + 1,
                 last_seen_at = NOW()"#,
        )
        .bind(p)
        .bind(RULE_VERSION)
        .execute(&mut *tx)
        .await?;
    }
    for &p in synergy_verified {
        sqlx::query(
            r#"INSERT INTO insight_fidraulis_passcode_stats (passcode, rule_version, cooccurrence_extra_with_fid, synergy_verified_pass, synergy_heuristic_pass, first_seen_at, last_seen_at)
               VALUES ($1, $2, 0, 1, 0, NOW(), NOW())
               ON CONFLICT (passcode, rule_version) DO UPDATE SET
                 synergy_verified_pass = insight_fidraulis_passcode_stats.synergy_verified_pass + 1,
                 last_seen_at = NOW()"#,
        )
        .bind(p)
        .bind(RULE_VERSION)
        .execute(&mut *tx)
        .await?;
    }
    for &p in synergy_heuristic {
        sqlx::query(
            r#"INSERT INTO insight_fidraulis_passcode_stats (passcode, rule_version, cooccurrence_extra_with_fid, synergy_verified_pass, synergy_heuristic_pass, first_seen_at, last_seen_at)
               VALUES ($1, $2, 0, 0, 1, NOW(), NOW())
               ON CONFLICT (passcode, rule_version) DO UPDATE SET
                 synergy_heuristic_pass = insight_fidraulis_passcode_stats.synergy_heuristic_pass + 1,
                 last_seen_at = NOW()"#,
        )
        .bind(p)
        .bind(RULE_VERSION)
        .execute(&mut *tx)
        .await?;
    }
    sqlx::query(
        r#"INSERT INTO insight_fidraulis_deck_last_sync (site_user_id, deck_id, fingerprint, rule_version, last_sent_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (site_user_id, deck_id) DO UPDATE SET
             fingerprint = EXCLUDED.fingerprint,
             rule_version = EXCLUDED.rule_version,
             last_sent_at = NOW()"#,
    )
    .bind(site_user_id)
    .bind(deck_id)
    .bind(fingerprint)
    .bind(RULE_VERSION)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PasscodeStatRow {
    pub passcode: i64,
    pub cooccurrence_extra_with_fid: i64,
    pub synergy_verified_pass: i64,
    pub synergy_heuristic_pass: i64,
}

pub async fn list_aggregate_page(
    pool: &PgPool,
    limit: i64,
    offset: i64,
) -> Result<Vec<PasscodeStatRow>, sqlx::Error> {
    let rows = sqlx::query_as::<_, PasscodeStatRow>(
        r#"SELECT passcode,
                  cooccurrence_extra_with_fid,
                  synergy_verified_pass,
                  synergy_heuristic_pass
             FROM insight_fidraulis_passcode_stats
             WHERE rule_version = $1
             ORDER BY (synergy_verified_pass * 10 + synergy_heuristic_pass + cooccurrence_extra_with_fid) DESC,
                      passcode ASC
             LIMIT $2 OFFSET $3"#,
    )
    .bind(RULE_VERSION)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
