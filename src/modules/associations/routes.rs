//! Routes « cartes associées » : catalogue enrichi + Q&A YGOrg.

use std::collections::HashSet;

use actix_web::{get, web, HttpResponse};

use crate::images::ImageRepository;
use crate::shared::search::cache::CardCache;

use super::repository::{
    list_our_card_ids_sharing_ygorg_qa_with, ygorg_en_catalog_fields_by_card_id,
    ygorg_internal_id_for_our_card, YgOrgEnCatalogFields,
};

/// Catalogue minimal pour le module « cartes associées » (front).
#[derive(serde::Serialize)]
pub struct AssociationCatalogEntry {
    pub id: u64,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archetype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub desc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_effect_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_pendulum_effect_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_flavor_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_link_effect_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_name_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

#[get("/associations/catalog")]
pub async fn associations_catalog(
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let ygorg_map: std::collections::HashMap<i64, YgOrgEnCatalogFields> = match pool.as_ref() {
        Some(p) => ygorg_en_catalog_fields_by_card_id(p.get_ref())
            .await
            .unwrap_or_else(|e| {
                tracing::warn!(
                    "associations_catalog: ygorg_en_catalog_fields_by_card_id: {}",
                    e
                );
                std::collections::HashMap::new()
            }),
        None => std::collections::HashMap::new(),
    };

    let cards = card_cache.get();

    let image_map: std::collections::HashMap<String, uuid::Uuid> = if let Some(pool) = pool.as_ref()
    {
        let urls: Vec<String> = {
            let set: std::collections::HashSet<String> = cards
                .iter()
                .filter_map(|c| c.image_url().map(|u| u.trim().to_string()))
                .filter(|s| !s.is_empty())
                .collect();
            set.into_iter().collect()
        };
        if urls.is_empty() {
            std::collections::HashMap::new()
        } else {
            ImageRepository::map_original_urls_to_ids(pool.get_ref(), &urls)
                .await
                .unwrap_or_else(|e| {
                    tracing::warn!("associations_catalog: map_original_urls_to_ids: {}", e);
                    std::collections::HashMap::new()
                })
        }
    } else {
        std::collections::HashMap::new()
    };

    let entries: Vec<AssociationCatalogEntry> = cards
        .iter()
        .map(|c| {
            let id_i64 = c.id() as i64;
            let y = ygorg_map.get(&id_i64);
            let image_url = c.image_url().and_then(|u| {
                let t = u.trim();
                if t.is_empty() {
                    return None;
                }
                if let Some(id) = image_map.get(t) {
                    Some(format!("/images/{}/file/mobile", id))
                } else {
                    Some(t.to_string())
                }
            });
            AssociationCatalogEntry {
                id: c.id(),
                name: c.as_str().to_string(),
                name_en: c.card_name_en().map(|n| n.as_str().to_string()),
                archetype: c.archetype().map(|s| s.to_string()),
                desc: c
                    .card_desc()
                    .map(|s| s.to_string())
                    .filter(|s| !s.trim().is_empty()),
                ygorg_effect_en: y.and_then(|f| f.effect_text.clone()),
                ygorg_pendulum_effect_en: y.and_then(|f| f.pendulum_effect.clone()),
                ygorg_flavor_en: y.and_then(|f| f.flavor_text.clone()),
                ygorg_link_effect_en: y.and_then(|f| f.link_effect.clone()),
                ygorg_name_en: y.and_then(|f| f.name_en.clone()),
                image_url,
            }
        })
        .collect();
    HttpResponse::Ok().json(entries)
}

#[derive(serde::Deserialize)]
pub struct QaRelatedQuery {
    pub card_id: u64,
}

#[get("/associations/qa_related")]
pub async fn associations_qa_related(
    query: web::Query<QaRelatedQuery>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let empty: Vec<u64> = Vec::new();
    let Some(pool) = pool else {
        return HttpResponse::Ok().json(empty);
    };
    let cid = query.card_id as i64;
    let yg = match ygorg_internal_id_for_our_card(pool.get_ref(), cid).await {
        Ok(x) => x,
        Err(e) => {
            tracing::warn!("associations_qa_related: map: {}", e);
            return HttpResponse::Ok().json(empty);
        }
    };
    let Some(yid) = yg else {
        return HttpResponse::Ok().json(empty);
    };
    let ids = match list_our_card_ids_sharing_ygorg_qa_with(pool.get_ref(), yid, cid).await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("associations_qa_related: list: {}", e);
            return HttpResponse::Ok().json(empty);
        }
    };
    let out: Vec<u64> = ids.into_iter().map(|x| x as u64).collect();
    HttpResponse::Ok().json(out)
}
