//! Persistance SQL télémétrie Fidraulis.

use sqlx::PgPool;
use uuid::Uuid;

use super::fingerprint::RULE_VERSION;
use super::synergy_delta::SynergyTelemetryDelta;

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

/// Dernier sync persisté pour ce deck (delta + court-circuit fingerprint).
#[derive(Debug, Clone)]
pub struct DeckLastSyncSnapshot {
    pub fingerprint: String,
    /// `None` = ligne créée avant la migration synergy (baseline au prochain POST persist).
    pub last_synergy_verified: Option<Vec<i64>>,
    pub last_synergy_heuristic: Option<Vec<i64>>,
}

type LastSyncSqlRow = (String, Option<Vec<i64>>, Option<Vec<i64>>);

impl DeckLastSyncSnapshot {
    /// Ligne `insight_fidraulis_deck_last_sync` sans colonnes synergy : premier POST persisté aligne l’état sans incrémenter les stats.
    pub fn is_legacy_synergy_arrays(&self) -> bool {
        self.last_synergy_verified.is_none() || self.last_synergy_heuristic.is_none()
    }
}

pub async fn get_last_deck_sync(
    pool: &PgPool,
    site_user_id: Uuid,
    deck_id: i32,
) -> Result<Option<DeckLastSyncSnapshot>, sqlx::Error> {
    let row: Option<LastSyncSqlRow> = sqlx::query_as(
        r#"SELECT fingerprint, last_synergy_verified, last_synergy_heuristic
             FROM insight_fidraulis_deck_last_sync
            WHERE site_user_id = $1 AND deck_id = $2"#,
    )
    .bind(site_user_id)
    .bind(deck_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(
        |(fingerprint, last_synergy_verified, last_synergy_heuristic)| DeckLastSyncSnapshot {
            fingerprint,
            last_synergy_verified,
            last_synergy_heuristic,
        },
    ))
}

/// Applique delta synergy + mise à jour du dernier sync (transaction).
///
/// `baseline_only` : remplit `last_synergy_*` + empreinte sans toucher à `insight_fidraulis_passcode_stats`.
#[allow(clippy::too_many_arguments)]
pub async fn apply_telemetry_increments(
    pool: &PgPool,
    site_user_id: Uuid,
    deck_id: i32,
    fingerprint: &str,
    current_verified: &[i64],
    current_heuristic: &[i64],
    delta: &SynergyTelemetryDelta,
    baseline_only: bool,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    if !baseline_only {
        for &p in &delta.dec_verified {
            sqlx::query(
                r#"UPDATE insight_fidraulis_passcode_stats
                      SET synergy_verified_pass = GREATEST(0, synergy_verified_pass - 1),
                          last_seen_at = NOW()
                    WHERE passcode = $1 AND rule_version = $2"#,
            )
            .bind(p)
            .bind(RULE_VERSION)
            .execute(&mut *tx)
            .await?;
        }
        for &p in &delta.dec_heuristic {
            sqlx::query(
                r#"UPDATE insight_fidraulis_passcode_stats
                      SET synergy_heuristic_pass = GREATEST(0, synergy_heuristic_pass - 1),
                          last_seen_at = NOW()
                    WHERE passcode = $1 AND rule_version = $2"#,
            )
            .bind(p)
            .bind(RULE_VERSION)
            .execute(&mut *tx)
            .await?;
        }
        for &p in &delta.inc_verified {
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
        for &p in &delta.inc_heuristic {
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
    }

    sqlx::query(
        r#"INSERT INTO insight_fidraulis_deck_last_sync (
                 site_user_id, deck_id, fingerprint, rule_version, last_sent_at,
                 last_synergy_verified, last_synergy_heuristic
             )
             VALUES ($1, $2, $3, $4, NOW(), $5, $6)
        ON CONFLICT (site_user_id, deck_id) DO UPDATE SET
               fingerprint = EXCLUDED.fingerprint,
               rule_version = EXCLUDED.rule_version,
               last_sent_at = NOW(),
               last_synergy_verified = EXCLUDED.last_synergy_verified,
               last_synergy_heuristic = EXCLUDED.last_synergy_heuristic"#,
    )
    .bind(site_user_id)
    .bind(deck_id)
    .bind(fingerprint)
    .bind(RULE_VERSION)
    .bind(current_verified)
    .bind(current_heuristic)
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
               AND (synergy_verified_pass + synergy_heuristic_pass) > 0
             ORDER BY (synergy_verified_pass * 10 + synergy_heuristic_pass) DESC,
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
