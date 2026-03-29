//! Enrichissement YGOrganization / YGResources, cache externe, Q&A.

use std::collections::HashSet;

use sqlx::PgPool;

use super::error::DbError;

/// `source` pour [`upsert_card_enrichment_layer`] — aligné sur `docs/enrichment-pipeline.md`.
pub const YGORG_ENRICHMENT_SOURCE: &str = "ygorganization";
/// Couche JSON brut tel que renvoyé par `GET /data/card/{id}`.
pub const YGORG_LAYER_CARD_RAW: &str = "card_raw";

/// Dernière révision `X-Cache-Revision` connue pour cette source (table `external_api_cache_state`).
pub async fn get_external_cache_revision(
    pool: &PgPool,
    source: &str,
) -> Result<Option<i64>, DbError> {
    let row: Option<(i64,)> =
        sqlx::query_as("SELECT cache_revision FROM external_api_cache_state WHERE source = $1")
            .bind(source)
            .fetch_optional(pool)
            .await?;
    Ok(row.map(|(r,)| r))
}

pub async fn set_external_cache_revision(
    pool: &PgPool,
    source: &str,
    revision: i64,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO external_api_cache_state (source, cache_revision, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (source) DO UPDATE SET
            cache_revision = EXCLUDED.cache_revision,
            updated_at = NOW()
        "#,
    )
    .bind(source)
    .bind(revision)
    .execute(pool)
    .await?;
    Ok(())
}

/// Upsert une couche d’enrichissement (`card_enrichment_layers`).
pub async fn upsert_card_enrichment_layer(
    pool: &PgPool,
    card_id: i64,
    source: &str,
    layer: &str,
    payload: &serde_json::Value,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO card_enrichment_layers (card_id, source, layer, payload, fetched_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (card_id, source, layer) DO UPDATE SET
            payload = EXCLUDED.payload,
            fetched_at = EXCLUDED.fetched_at
        "#,
    )
    .bind(card_id)
    .bind(source)
    .bind(layer)
    .bind(payload)
    .execute(pool)
    .await?;
    Ok(())
}

/// Filtre `ids` pour ne garder que les IDs présents dans `cards` (évite violation FK).
pub async fn filter_existing_card_ids(pool: &PgPool, ids: &[i64]) -> Result<Vec<i64>, DbError> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let mut present = HashSet::new();
    for chunk in ids.chunks(450) {
        let mut qb = sqlx::QueryBuilder::new("SELECT id FROM cards WHERE id IN (");
        {
            let mut sep = qb.separated(", ");
            for id in chunk {
                sep.push_bind(*id);
            }
        }
        qb.push(")");
        let rows: Vec<(i64,)> = qb.build_query_as().fetch_all(pool).await?;
        for (id,) in rows {
            present.insert(id);
        }
    }
    Ok(ids
        .iter()
        .copied()
        .filter(|id| present.contains(id))
        .collect())
}

/// Cartes sans ligne d’enrichissement YGOrg pour `source` / `layer`.
pub async fn list_card_ids_missing_ygorg_layer(
    pool: &PgPool,
    source: &str,
    layer: &str,
    limit: i64,
) -> Result<Vec<i64>, DbError> {
    let rows = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT c.id FROM cards c
        WHERE NOT EXISTS (
            SELECT 1 FROM card_enrichment_layers e
            WHERE e.card_id = c.id AND e.source = $1 AND e.layer = $2
        )
        ORDER BY c.id
        LIMIT $3
        "#,
    )
    .bind(source)
    .bind(layer)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

/// Cartes sans `card_raw` YGOrg et sans ligne `card_ygorg_unresolved` (backfill par nom).
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct YgOrgBackfillCardRow {
    pub id: i64,
    pub name: String,
    pub name_en: Option<String>,
}

pub async fn list_cards_for_ygorg_backfill(
    pool: &PgPool,
    source: &str,
    layer: &str,
    limit: i64,
) -> Result<Vec<YgOrgBackfillCardRow>, DbError> {
    let rows = sqlx::query_as::<_, YgOrgBackfillCardRow>(
        r#"
        SELECT c.id, c.name, c.name_en FROM cards c
        WHERE NOT EXISTS (
            SELECT 1 FROM card_enrichment_layers e
            WHERE e.card_id = c.id AND e.source = $1 AND e.layer = $2
        )
        AND NOT EXISTS (
            SELECT 1 FROM card_ygorg_unresolved u WHERE u.card_id = c.id
        )
        ORDER BY c.id
        LIMIT $3
        "#,
    )
    .bind(source)
    .bind(layer)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

/// Vide l’index nom EN (avant resync).
pub async fn truncate_ygorg_name_index(pool: &PgPool) -> Result<(), DbError> {
    sqlx::query("TRUNCATE ygorg_en_name_index")
        .execute(pool)
        .await?;
    Ok(())
}

/// Supprime les marqueurs « non résolu » (ex. après un nouveau `sync_index`).
pub async fn clear_ygorg_unresolved(pool: &PgPool) -> Result<u64, DbError> {
    let res = sqlx::query("DELETE FROM card_ygorg_unresolved")
        .execute(pool)
        .await?;
    Ok(res.rows_affected())
}

const YGORG_NAME_INSERT_BATCH: usize = 400;

/// Insère des paires (nom exact, id YGOrg) — appeler après `truncate_ygorg_name_index`.
pub async fn insert_ygorg_name_index_rows(
    pool: &PgPool,
    rows: &[(String, i64)],
) -> Result<u64, DbError> {
    if rows.is_empty() {
        return Ok(0);
    }
    let sql = r#"
        INSERT INTO ygorg_en_name_index (name_exact, ygorg_internal_id)
        VALUES ($1, $2)
        ON CONFLICT (name_exact, ygorg_internal_id) DO NOTHING
    "#;
    let mut n = 0u64;
    for chunk in rows.chunks(YGORG_NAME_INSERT_BATCH) {
        let mut tx = pool.begin().await?;
        for (name, yid) in chunk {
            let r = sqlx::query(sql)
                .bind(name)
                .bind(yid)
                .execute(&mut *tx)
                .await?;
            n += r.rows_affected();
        }
        tx.commit().await?;
    }
    Ok(n)
}

pub async fn count_ygorg_name_index_rows(pool: &PgPool) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*)::bigint FROM ygorg_en_name_index")
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}

/// Premier id YGOrg pour un nom EN exact (plus petit id si plusieurs entrées).
pub async fn lookup_ygorg_id_by_exact_name(
    pool: &PgPool,
    name_exact: &str,
) -> Result<Option<i64>, DbError> {
    let row: Option<(i64,)> = sqlx::query_as(
        r#"
        SELECT ygorg_internal_id FROM ygorg_en_name_index
        WHERE name_exact = $1
        ORDER BY ygorg_internal_id
        LIMIT 1
        "#,
    )
    .bind(name_exact)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|(id,)| id))
}

pub async fn mark_ygorg_unresolved(
    pool: &PgPool,
    card_id: i64,
    reason: &str,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO card_ygorg_unresolved (card_id, reason)
        VALUES ($1, $2)
        ON CONFLICT (card_id) DO UPDATE SET
            reason = EXCLUDED.reason,
            tried_at = NOW()
        "#,
    )
    .bind(card_id)
    .bind(reason)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_card_ygorg_id_map(
    pool: &PgPool,
    card_id: i64,
    ygorg_internal_id: i64,
) -> Result<(), DbError> {
    sqlx::query(
        r#"
        INSERT INTO card_ygorg_id_map (card_id, ygorg_internal_id, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (card_id) DO UPDATE SET
            ygorg_internal_id = EXCLUDED.ygorg_internal_id,
            updated_at = NOW()
        "#,
    )
    .bind(card_id)
    .bind(ygorg_internal_id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Nos `card_id` associés à un id interne YGResources (manifest).
pub async fn list_card_ids_by_ygorg_internal_id(
    pool: &PgPool,
    ygorg_internal_id: i64,
) -> Result<Vec<i64>, DbError> {
    sqlx::query_scalar::<_, i64>(
        "SELECT card_id FROM card_ygorg_id_map WHERE ygorg_internal_id = $1",
    )
    .bind(ygorg_internal_id)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

/// Upsert une entrée Q&A (`cards` = ids internes YGOrg).
pub async fn upsert_ygorg_qa_entry(
    pool: &PgPool,
    qa_id: i64,
    related_ygorg_card_ids: &[i64],
) -> Result<(), DbError> {
    if related_ygorg_card_ids.is_empty() {
        return Ok(());
    }
    sqlx::query(
        r#"
        INSERT INTO ygorg_qa_entries (qa_id, related_ygorg_card_ids, fetched_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (qa_id) DO UPDATE SET
            related_ygorg_card_ids = EXCLUDED.related_ygorg_card_ids,
            fetched_at = NOW()
        "#,
    )
    .bind(qa_id)
    .bind(related_ygorg_card_ids)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn count_ygorg_qa_entries(pool: &PgPool) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*)::bigint FROM ygorg_qa_entries")
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}
