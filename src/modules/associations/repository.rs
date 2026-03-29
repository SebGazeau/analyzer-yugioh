//! Persistance lue pour les routes « cartes associées » (étape 3.2).

use std::collections::HashMap;

use sqlx::PgPool;

use crate::db::{DbError, YGORG_ENRICHMENT_SOURCE, YGORG_LAYER_CARD_RAW};

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
) -> Result<HashMap<i64, YgOrgEnCatalogFields>, DbError> {
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

/// Id interne YGOrg pour une ligne `cards` (nécessaire pour Q&A côté routes).
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
