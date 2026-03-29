//! Table `cards` : cache, upsert YGOProDeck, URLs images.

use std::collections::HashSet;

use sqlx::{FromRow, PgPool};

use crate::shared::structs::card_search_result::{CardSearchResult, RawCardSearchResult};
use crate::ygo_api::CardUpsertRow;

use super::error::DbError;

/// Une ligne de la table `cards` (colonnes utilisées pour le cache).
#[derive(Debug, FromRow)]
pub struct CardRow {
    pub id: i64,
    pub name: String,
    pub name_en: Option<String>,
    #[sqlx(rename = "type")]
    pub type_: String,
    pub attribute: Option<String>,
    pub race: Option<String>,
    pub level: Option<i16>,
    pub archetype: Option<String>,
    pub atk: Option<i32>,
    pub def: Option<i32>,
    pub frame_type: Option<String>,
    pub ygoprodeck_url: Option<String>,
    pub image_url: Option<String>,
    pub image_url_small: Option<String>,
    #[sqlx(rename = "ban_tcg")]
    pub ban_tcg: Option<String>,
    pub card_desc: Option<String>,
}

impl From<CardRow> for RawCardSearchResult {
    fn from(row: CardRow) -> Self {
        RawCardSearchResult {
            id: row.id as u64,
            name: row.name,
            name_en: row.name_en,
            card_type_raw: row.type_,
            attribute: row.attribute,
            race: row.race,
            level: row.level.map(|l| l as u8),
            archetype: row.archetype,
            atk: row.atk,
            def: row.def,
            frame_type: row.frame_type,
            ygoprodeck_url: row.ygoprodeck_url,
            image_url: row.image_url,
            image_url_small: row.image_url_small,
            ban_tcg: row.ban_tcg,
            card_desc: row.card_desc.filter(|s| !s.trim().is_empty()),
        }
    }
}

/// Identifiants de cartes présents en base (pour filtrer les réponses API sans FK en erreur).
pub async fn list_card_ids(pool: &PgPool) -> Result<HashSet<i64>, DbError> {
    let ids: Vec<i64> = sqlx::query_scalar("SELECT id FROM cards")
        .fetch_all(pool)
        .await?;
    Ok(ids.into_iter().collect::<HashSet<_>>())
}

/// Charge toutes les cartes depuis la table `cards` (colonnes alignées sur le cache).
pub async fn load_all_cards(pool: &PgPool) -> Result<Vec<CardSearchResult>, DbError> {
    // Cast ENUMs to text pour que sqlx décode en String (card_type, card_attribute, card_frame en base).
    let rows: Vec<CardRow> = sqlx::query_as::<_, CardRow>(
        "SELECT id, name, name_en, type::text AS type, attribute::text AS attribute, race, level, archetype, atk, def, frame_type::text AS frame_type, ygoprodeck_url, image_url, image_url_small, ban_tcg::text AS ban_tcg, NULLIF(TRIM(card_desc), '') AS card_desc FROM cards ORDER BY id",
    )
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .enumerate()
        .map(|(i, row)| {
            CardSearchResult::try_from(RawCardSearchResult::from(row)).map_err(|e| {
                DbError::InvalidCard {
                    index: i,
                    source: e,
                }
            })
        })
        .collect()
}

const UPSERT_BATCH_SIZE: usize = 200;

/// Upsert des cartes en batch (INSERT ... ON CONFLICT DO UPDATE). Idempotent.
pub async fn upsert_cards(pool: &PgPool, rows: &[CardUpsertRow]) -> Result<u64, DbError> {
    let mut total = 0u64;
    for chunk in rows.chunks(UPSERT_BATCH_SIZE) {
        let n = upsert_cards_batch(pool, chunk).await?;
        total += n;
    }
    Ok(total)
}

async fn upsert_cards_batch(pool: &PgPool, rows: &[CardUpsertRow]) -> Result<u64, DbError> {
    if rows.is_empty() {
        return Ok(0);
    }
    let mut tx = pool.begin().await?;
    let mut affected = 0u64;
    let sql = r#"
        INSERT INTO cards (id, name, name_en, type, attribute, frame_type, race, level, archetype, atk, def, ygoprodeck_url, card_desc, image_url, image_url_small, image_url_cropped, ban_tcg, ban_ocg)
        VALUES ($1, $2, $3, $4::card_type, $5::card_attribute, $6::card_frame, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::ban_status, $18::ban_status)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            name_en = EXCLUDED.name_en,
            type = EXCLUDED.type,
            attribute = EXCLUDED.attribute,
            frame_type = EXCLUDED.frame_type,
            race = EXCLUDED.race,
            level = EXCLUDED.level,
            archetype = EXCLUDED.archetype,
            atk = EXCLUDED.atk,
            def = EXCLUDED.def,
            ygoprodeck_url = EXCLUDED.ygoprodeck_url,
            card_desc = EXCLUDED.card_desc,
            image_url = EXCLUDED.image_url,
            image_url_small = EXCLUDED.image_url_small,
            image_url_cropped = EXCLUDED.image_url_cropped,
            ban_tcg = EXCLUDED.ban_tcg,
            ban_ocg = EXCLUDED.ban_ocg,
            updated_at = NOW()
    "#;
    for r in rows {
        let res = sqlx::query(sql)
            .bind(r.id)
            .bind(&r.name)
            .bind(&r.name_en)
            .bind(&r.type_)
            .bind(&r.attribute)
            .bind(&r.frame_type)
            .bind(&r.race)
            .bind(r.level)
            .bind(&r.archetype)
            .bind(r.atk)
            .bind(r.def)
            .bind(&r.ygoprodeck_url)
            .bind(&r.card_desc)
            .bind(&r.image_url)
            .bind(&r.image_url_small)
            .bind(&r.image_url_cropped)
            .bind(&r.ban_tcg)
            .bind(&r.ban_ocg)
            .execute(&mut *tx)
            .await?;
        affected += res.rows_affected();
    }
    tx.commit().await?;
    Ok(affected)
}

const CARD_SET_UPSERT_BATCH: usize = 400;

/// Upsert des lignes `card_sets` (YGOProDeck `card_sets[]`). Pas de prix (`set_price` NULL).
/// Au conflit : met à jour `set_name` et `rarity` ; `set_price` existant inchangé.
pub async fn upsert_card_sets(
    pool: &PgPool,
    rows: &[crate::ygo_api::CardSetUpsertRow],
) -> Result<u64, DbError> {
    if rows.is_empty() {
        return Ok(0);
    }
    let sql = r#"
        INSERT INTO card_sets (card_id, set_code, rarity_code, set_name, rarity, set_price)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (card_id, set_code, rarity_code) DO UPDATE SET
            set_name = EXCLUDED.set_name,
            rarity = EXCLUDED.rarity
    "#;
    let mut total = 0u64;
    for chunk in rows.chunks(CARD_SET_UPSERT_BATCH) {
        let mut tx = pool.begin().await?;
        for r in chunk {
            let res = sqlx::query(sql)
                .bind(r.card_id)
                .bind(&r.set_code)
                .bind(&r.rarity_code)
                .bind(&r.set_name)
                .bind(&r.rarity)
                .bind(&r.set_price)
                .execute(&mut *tx)
                .await?;
            total += res.rows_affected();
        }
        tx.commit().await?;
    }
    Ok(total)
}

/// Liste toutes les URLs d'images des cartes (pour l'importer, sans refetch API).
pub async fn list_card_image_urls(pool: &PgPool) -> Result<Vec<String>, DbError> {
    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT image_url FROM cards WHERE image_url IS NOT NULL AND image_url != ''",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|(u,)| u).collect())
}
