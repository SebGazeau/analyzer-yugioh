//! Catalogue : recherche, fiche par nom, compteur, validation deck.

use std::collections::HashSet;

use actix_web::{HttpResponse, Responder, get, http::StatusCode, post, web};
use serde::Deserialize;

use crate::images::ImageRepository;
use crate::shared::{
    enums::app_error::AppError,
    search::{cache::CardCache, card_resolve::normalize_name_for_match, filter::filter_cards},
    structs::{
        deck_validation::DeckValidationRequest, search_card_dto::SearchCardDto,
        search_query::SearchQuery,
    },
};

use super::helper::overlay_search_dto_image_url;
use super::repository::{
    card_ids_matching_locale_search, fetch_card_locales_map, find_card_id_by_locale_name,
};

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    #[serde(default)]
    pub locale: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CardByNameParams {
    pub name: String,
    #[serde(default)]
    pub locale: Option<String>,
}

#[get("/search")]
pub async fn search(
    params: web::Query<SearchParams>,
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> Result<HttpResponse, AppError> {
    let search_query = SearchQuery::new(params.q.clone())?;
    let cards = card_cache.get();
    let locale_opt = params
        .locale
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let mut filtered = filter_cards(&cards, &search_query);

    if let (Some(pool), Some(loc)) = (pool.as_ref(), locale_opt) {
        match card_ids_matching_locale_search(pool.get_ref(), loc, search_query.query()).await {
            Ok(extra_ids) if !extra_ids.is_empty() => {
                let have: HashSet<u64> = filtered.iter().map(|c| c.id()).collect();
                for card in cards.iter() {
                    if extra_ids.contains(&(card.id() as i64)) && !have.contains(&card.id()) {
                        filtered.push(card.clone());
                    }
                }
            }
            Ok(_) => {}
            Err(e) => tracing::warn!(error = %e, "search: card_locales side-query"),
        }
    }

    let mut dto: Vec<SearchCardDto> = filtered
        .iter()
        .map(|c| c.to_search_dto(cards.as_ref()))
        .collect();

    if let (Some(pool), Some(loc)) = (pool.as_ref(), locale_opt) {
        let ids: Vec<i64> = filtered.iter().map(|c| c.id() as i64).collect();
        match fetch_card_locales_map(pool.get_ref(), loc, &ids).await {
            Ok(map) => {
                for (card, d) in filtered.iter().zip(dto.iter_mut()) {
                    if let Some((n, desc)) = map.get(&(card.id() as i64)) {
                        d.name.clone_from(n);
                        if !desc.trim().is_empty() {
                            d.desc = Some(desc.clone());
                        }
                    }
                }
            }
            Err(e) => tracing::warn!(error = %e, "search: fetch_card_locales_map"),
        }
    }

    if let Some(pool) = pool {
        let urls: Vec<String> = {
            let set: HashSet<String> = filtered
                .iter()
                .filter_map(|c| c.image_url().map(|u| u.trim().to_string()))
                .filter(|s| !s.is_empty())
                .collect();
            set.into_iter().collect()
        };
        if !urls.is_empty() {
            if let Ok(map) = ImageRepository::get_ids_by_original_urls(pool.get_ref(), &urls).await
            {
                for (card, d) in filtered.iter().zip(dto.iter_mut()) {
                    if let Some(url) = card.image_url() {
                        let key = url.trim();
                        if let Some(id) = map.get(key) {
                            d.image_url = Some(format!("/images/{}/file/desktop", id));
                        }
                    }
                }
            }
        }
    }
    Ok(HttpResponse::Ok().json(dto))
}

#[get("/card")]
pub async fn card_by_name(
    params: web::Query<CardByNameParams>,
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let name = params.name.trim();
    if name.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!(null));
    }
    let name_norm = normalize_name_for_match(name);
    let cards = card_cache.get();
    let locale_opt = params
        .locale
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let found = cards.iter().find(|c| {
        normalize_name_for_match(c.as_str()) == name_norm
            || c.card_name_en()
                .map(|n| normalize_name_for_match(n.as_str()) == name_norm)
                .unwrap_or(false)
    });

    let pool_ref = pool.as_ref().map(|p| p.get_ref());

    if let Some(c) = found {
        let mut dto = c.to_search_dto(cards.as_ref());
        dto.name = name.to_string();
        if let (Some(pool), Some(loc)) = (pool_ref, locale_opt) {
            let ids = [c.id() as i64];
            if let Ok(map) = fetch_card_locales_map(pool, loc, &ids).await {
                if let Some((n, desc)) = map.get(&(c.id() as i64)) {
                    dto.name.clone_from(n);
                    if !desc.trim().is_empty() {
                        dto.desc = Some(desc.clone());
                    }
                }
            }
        }
        overlay_search_dto_image_url(pool_ref, c, &mut dto).await;
        return HttpResponse::Ok().json(dto);
    }

    if let (Some(pool), Some(loc)) = (pool_ref, locale_opt) {
        if let Ok(Some((cid, loc_name, loc_desc))) =
            find_card_id_by_locale_name(pool, loc, &name_norm, name).await
        {
            if let Some(c) = cards.iter().find(|cc| cc.id() == cid as u64) {
                let mut dto = c.to_search_dto(cards.as_ref());
                dto.name = loc_name;
                if !loc_desc.trim().is_empty() {
                    dto.desc = Some(loc_desc);
                }
                overlay_search_dto_image_url(pool_ref, c, &mut dto).await;
                return HttpResponse::Ok().json(dto);
            }
        }
    }

    HttpResponse::Ok().json(serde_json::Value::Null)
}

#[get("/count")]
pub async fn count(card_cache: web::Data<CardCache>) -> impl Responder {
    let count = card_cache.get().len();
    HttpResponse::Ok().body(count.to_string())
}

#[post("/validate_deck")]
pub async fn validate_deck(
    deck: web::Json<DeckValidationRequest>,
    card_cache: web::Data<CardCache>,
) -> HttpResponse {
    let cards = card_cache.get();
    let response = deck.into_inner().validate(&cards);
    let status = if response.valid {
        StatusCode::OK
    } else {
        StatusCode::BAD_REQUEST
    };
    HttpResponse::build(status).json(response)
}
