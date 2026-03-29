//! Écriture `card_locales` (upsert). La lecture / recherche locale vit dans
//! `modules/catalog/repository.rs`.

use sqlx::PgPool;

use super::error::DbError;

/// Ligne pour upsert dans `card_locales`.
#[derive(Debug, Clone)]
pub struct CardLocaleUpsertRow {
    pub card_id: i64,
    pub locale: String,
    pub name: String,
    pub card_desc: String,
    pub source: String,
}

const CARD_LOCALE_BATCH: usize = 400;

/// Upsert des traductions (PK `card_id` + `locale`). Dernière écriture gagne.
pub async fn upsert_card_locales(
    pool: &PgPool,
    rows: &[CardLocaleUpsertRow],
) -> Result<u64, DbError> {
    if rows.is_empty() {
        return Ok(0);
    }
    let mut total = 0u64;
    for chunk in rows.chunks(CARD_LOCALE_BATCH) {
        let mut tx = pool.begin().await?;
        for r in chunk {
            let res = sqlx::query(
                r#"
                INSERT INTO card_locales (card_id, locale, name, card_desc, source, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (card_id, locale) DO UPDATE SET
                    name = EXCLUDED.name,
                    card_desc = EXCLUDED.card_desc,
                    source = EXCLUDED.source,
                    updated_at = NOW()
                "#,
            )
            .bind(r.card_id)
            .bind(&r.locale)
            .bind(&r.name)
            .bind(&r.card_desc)
            .bind(&r.source)
            .execute(&mut *tx)
            .await?;
            total += res.rows_affected();
        }
        tx.commit().await?;
    }
    Ok(total)
}
