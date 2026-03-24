//! Accès base de données (table `cards`).
//! Utilisé au démarrage pour charger le cache et par `/fetch_cards` (tâche 2).

use sqlx::{FromRow, PgPool};

use crate::shared::structs::card_search_result::{
    CardSearchResult, CardSearchResultError, RawCardSearchResult,
};
use crate::ygo_api::CardUpsertRow;

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

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("sqlx: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("migrate: {0}")]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error("invalid card at index {index}: {source}")]
    InvalidCard {
        index: usize,
        #[source]
        source: CardSearchResultError,
    },
}

/// Applique les migrations (dossier `migrations/` à la racine du projet).
pub async fn run_migrations(pool: &PgPool) -> Result<(), DbError> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
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

// ---------------------------------------------------------------------------
// Enrichissement externe (YGOrganization / YGResources)
// ---------------------------------------------------------------------------

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
    let mut present = std::collections::HashSet::new();
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

/// Champs EN YGResources utiles pour les associations (citations texte).
#[derive(Debug, Clone, Default)]
pub struct YgOrgEnCatalogFields {
    pub effect_text: Option<String>,
    pub pendulum_effect: Option<String>,
    pub flavor_text: Option<String>,
    /// Effet monstre Link (`linkEffect`) si présent.
    pub link_effect: Option<String>,
    /// Nom officiel EN côté YGResources (peut différer légèrement de `cards.name_en`).
    pub name_en: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct YgOrgEnCatalogSqlRow {
    card_id: i64,
    effect_text: Option<String>,
    pendulum_effect: Option<String>,
    flavor_text: Option<String>,
    link_effect: Option<String>,
    name_en: Option<String>,
}

/// Extrait `cardData.en` (effet, pendule, flavor, nom) pour `/associations/catalog`.
pub async fn ygorg_en_catalog_fields_by_card_id(
    pool: &PgPool,
) -> Result<std::collections::HashMap<i64, YgOrgEnCatalogFields>, DbError> {
    let rows: Vec<YgOrgEnCatalogSqlRow> = sqlx::query_as(
        r#"
        SELECT
            card_id,
            NULLIF(TRIM(payload #>> '{cardData,en,effectText}'), '') AS effect_text,
            NULLIF(TRIM(payload #>> '{cardData,en,pendulumEffect}'), '') AS pendulum_effect,
            NULLIF(TRIM(payload #>> '{cardData,en,flavorText}'), '') AS flavor_text,
            NULLIF(TRIM(payload #>> '{cardData,en,linkEffect}'), '') AS link_effect,
            NULLIF(TRIM(payload #>> '{cardData,en,name}'), '') AS name_en
        FROM card_enrichment_layers
        WHERE source = $1
          AND layer = $2
          AND (
              NULLIF(TRIM(payload #>> '{cardData,en,effectText}'), '') IS NOT NULL
              OR NULLIF(TRIM(payload #>> '{cardData,en,pendulumEffect}'), '') IS NOT NULL
              OR NULLIF(TRIM(payload #>> '{cardData,en,flavorText}'), '') IS NOT NULL
              OR NULLIF(TRIM(payload #>> '{cardData,en,linkEffect}'), '') IS NOT NULL
              OR NULLIF(TRIM(payload #>> '{cardData,en,name}'), '') IS NOT NULL
          )
        "#,
    )
    .bind(YGORG_ENRICHMENT_SOURCE)
    .bind(YGORG_LAYER_CARD_RAW)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| {
            (
                r.card_id,
                YgOrgEnCatalogFields {
                    effect_text: r.effect_text,
                    pendulum_effect: r.pendulum_effect,
                    flavor_text: r.flavor_text,
                    link_effect: r.link_effect,
                    name_en: r.name_en,
                },
            )
        })
        .collect())
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

/// Id interne YGOrg pour une ligne `cards` (nécessaire pour Q&A et manifest).
pub async fn ygorg_internal_id_for_our_card(
    pool: &PgPool,
    card_id: i64,
) -> Result<Option<i64>, DbError> {
    let row: Option<(i64,)> =
        sqlx::query_as("SELECT ygorg_internal_id FROM card_ygorg_id_map WHERE card_id = $1")
            .bind(card_id)
            .fetch_optional(pool)
            .await?;
    Ok(row.map(|(x,)| x))
}

/// Nos `card_id` qui partagent au moins une entrée Q&A avec l’id YGOrg donné (hors l’ancre).
pub async fn list_our_card_ids_sharing_ygorg_qa_with(
    pool: &PgPool,
    anchor_ygorg_internal_id: i64,
    exclude_our_card_id: i64,
) -> Result<Vec<i64>, DbError> {
    sqlx::query_scalar::<_, i64>(
        r#"
        SELECT DISTINCT m.card_id
        FROM ygorg_qa_entries q
        INNER JOIN card_ygorg_id_map m
            ON m.ygorg_internal_id = ANY(q.related_ygorg_card_ids)
        WHERE $1 = ANY(q.related_ygorg_card_ids)
          AND m.card_id <> $2
        ORDER BY m.card_id
        "#,
    )
    .bind(anchor_ygorg_internal_id)
    .bind(exclude_our_card_id)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn count_ygorg_qa_entries(pool: &PgPool) -> Result<i64, DbError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*)::bigint FROM ygorg_qa_entries")
        .fetch_one(pool)
        .await?;
    Ok(row.0)
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

// ---------------------------------------------------------------------------
// Decks (tables decks, deck_entries)
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Serialize)]
pub struct DeckListItem {
    pub id: i32,
    pub name: String,
    pub is_public: bool,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_card_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_image_url: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct DeckEntryItem {
    pub card_id: i64,
    pub name: String,
    pub zone: String,
    pub quantity: i16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engine: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,
}

/// Données pour insérer une entrée de deck (création / mise à jour).
pub struct DeckEntryInsert {
    pub card_id: i64,
    pub zone: String,
    pub quantity: i16,
    pub engine: Option<String>,
    pub categories: Vec<String>,
}

/// Liste les decks du compte connecté (`site_user_id`).
pub async fn list_decks_for_site_user(
    pool: &PgPool,
    site_user_id: uuid::Uuid,
) -> Result<Vec<DeckListItem>, DbError> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id: i32,
        name: String,
        is_public: bool,
        created_at: chrono::DateTime<chrono::Utc>,
        cover_card_name: Option<String>,
        cover_image_url: Option<String>,
    }
    let rows: Vec<Row> = sqlx::query_as(
        "SELECT id, name, is_public, created_at, cover_card_name, cover_image_url FROM decks WHERE site_user_id = $1 ORDER BY created_at DESC",
    )
    .bind(site_user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| DeckListItem {
            id: r.id,
            name: r.name,
            is_public: r.is_public,
            created_at: r.created_at.to_rfc3339(),
            cover_card_name: r.cover_card_name.filter(|s| !s.is_empty()),
            cover_image_url: r.cover_image_url.filter(|s| !s.is_empty()),
        })
        .collect())
}

/// Retourne un deck par id avec ses entrées et la couverture (réservé au propriétaire `site_user_id`).
pub async fn get_deck_with_entries(
    pool: &PgPool,
    deck_id: i32,
    site_user_id: uuid::Uuid,
) -> Result<
    Option<(
        String,
        bool,
        Option<String>,
        Option<String>,
        Vec<DeckEntryItem>,
    )>,
    DbError,
> {
    #[derive(sqlx::FromRow)]
    struct DeckRow {
        name: String,
        is_public: bool,
        cover_card_name: Option<String>,
        cover_image_url: Option<String>,
    }
    let deck: Option<DeckRow> = sqlx::query_as(
        "SELECT name, is_public, cover_card_name, cover_image_url FROM decks WHERE id = $1 AND site_user_id = $2",
    )
    .bind(deck_id)
    .bind(site_user_id)
    .fetch_optional(pool)
    .await?;
    let deck = match deck {
        Some(d) => d,
        None => return Ok(None),
    };
    let cover_card_name = deck.cover_card_name.filter(|s| !s.is_empty());
    let cover_image_url = deck.cover_image_url.filter(|s| !s.is_empty());
    #[derive(sqlx::FromRow)]
    struct EntryRow {
        card_id: i64,
        name: String,
        zone: String,
        quantity: i16,
        engine: Option<String>,
        categories: Option<sqlx::types::Json<Vec<String>>>,
    }
    let entries: Vec<EntryRow> = sqlx::query_as(
        r#"
        SELECT e.card_id, c.name, e.zone::text AS zone, e.quantity, e.engine, e.categories
        FROM deck_entries e
        JOIN cards c ON c.id = e.card_id
        WHERE e.deck_id = $1
        ORDER BY e.zone, e.card_id
        "#,
    )
    .bind(deck_id)
    .fetch_all(pool)
    .await?;
    let items = entries
        .into_iter()
        .map(|r| DeckEntryItem {
            card_id: r.card_id,
            name: r.name,
            zone: r.zone,
            quantity: r.quantity,
            engine: r.engine.filter(|s| !s.is_empty()),
            categories: r.categories.map(|j| j.0),
        })
        .collect();
    Ok(Some((
        deck.name,
        deck.is_public,
        cover_card_name,
        cover_image_url,
        items,
    )))
}

/// Crée un deck et ses entrées pour un compte site.
pub async fn create_deck(
    pool: &PgPool,
    name: &str,
    site_user_id: uuid::Uuid,
    entries: &[DeckEntryInsert],
    cover_card_name: Option<&str>,
    cover_image_url: Option<&str>,
) -> Result<i32, DbError> {
    let row: (i32,) = sqlx::query_as(
        "INSERT INTO decks (name, user_id, site_user_id, is_public, cover_card_name, cover_image_url) VALUES ($1, NULL, $2, false, $3, $4) RETURNING id",
    )
    .bind(name)
    .bind(site_user_id)
    .bind(cover_card_name)
    .bind(cover_image_url)
    .fetch_one(pool)
    .await?;
    let deck_id = row.0;
    for e in entries {
        let cat_json =
            serde_json::to_value(&e.categories).unwrap_or(serde_json::Value::Array(vec![]));
        sqlx::query(
            "INSERT INTO deck_entries (deck_id, card_id, zone, quantity, engine, categories) VALUES ($1, $2, $3::deck_zone, $4, $5, $6)",
        )
        .bind(deck_id)
        .bind(e.card_id)
        .bind(&e.zone)
        .bind(e.quantity)
        .bind(e.engine.as_deref().unwrap_or(""))
        .bind(cat_json)
        .execute(pool)
        .await?;
    }
    Ok(deck_id)
}

/// Met à jour le nom, la couverture et remplace toutes les entrées du deck (propriétaire uniquement).
pub async fn update_deck(
    pool: &PgPool,
    deck_id: i32,
    site_user_id: uuid::Uuid,
    name: &str,
    entries: &[DeckEntryInsert],
    cover_card_name: Option<&str>,
    cover_image_url: Option<&str>,
) -> Result<bool, DbError> {
    let res = sqlx::query(
        "UPDATE decks SET name = $1, cover_card_name = $2, cover_image_url = $3, updated_at = NOW() WHERE id = $4 AND site_user_id = $5",
    )
    .bind(name)
    .bind(cover_card_name)
    .bind(cover_image_url)
    .bind(deck_id)
    .bind(site_user_id)
    .execute(pool)
    .await?;
    if res.rows_affected() == 0 {
        return Ok(false);
    }
    sqlx::query("DELETE FROM deck_entries WHERE deck_id = $1")
        .bind(deck_id)
        .execute(pool)
        .await?;
    for e in entries {
        let cat_json =
            serde_json::to_value(&e.categories).unwrap_or(serde_json::Value::Array(vec![]));
        sqlx::query(
            "INSERT INTO deck_entries (deck_id, card_id, zone, quantity, engine, categories) VALUES ($1, $2, $3::deck_zone, $4, $5, $6)",
        )
        .bind(deck_id)
        .bind(e.card_id)
        .bind(&e.zone)
        .bind(e.quantity)
        .bind(e.engine.as_deref().unwrap_or(""))
        .bind(cat_json)
        .execute(pool)
        .await?;
    }
    Ok(true)
}

/// Supprime un deck (CASCADE supprime les entrées) si le propriétaire correspond.
pub async fn delete_deck(
    pool: &PgPool,
    deck_id: i32,
    site_user_id: uuid::Uuid,
) -> Result<bool, DbError> {
    let res = sqlx::query("DELETE FROM decks WHERE id = $1 AND site_user_id = $2")
        .bind(deck_id)
        .bind(site_user_id)
        .execute(pool)
        .await?;
    Ok(res.rows_affected() > 0)
}
