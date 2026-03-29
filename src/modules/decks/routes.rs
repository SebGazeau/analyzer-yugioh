//! Routes HTTP CRUD `/decks` (utilisateur site authentifié par session).

use actix_session::Session;
use actix_web::{HttpResponse, delete, get, post, put, web};

use crate::shared::search::cache::CardCache;
use crate::shared::search::card_resolve::canonical_deck_passcode;
use crate::shared::structs::deck_validation::{DeckEntryDto, DeckValidationRequest};

use super::helper::{entries_to_insert, require_site_user_id};
use super::repository::{
    create_deck, delete_deck, get_deck_with_entries, list_decks_for_site_user, update_deck,
};

#[derive(Debug, serde::Deserialize)]
pub struct SaveDeckRequest {
    pub name: String,
    pub main: Option<Vec<DeckEntryDto>>,
    pub extra: Option<Vec<DeckEntryDto>>,
    pub side: Option<Vec<DeckEntryDto>>,
    #[serde(default)]
    pub cover_card_name: Option<String>,
    #[serde(default)]
    pub cover_image_url: Option<String>,
}

#[post("/decks")]
pub async fn create_deck_handler(
    session: Session,
    pool: Option<web::Data<sqlx::PgPool>>,
    card_cache: web::Data<CardCache>,
    body: web::Json<SaveDeckRequest>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => return HttpResponse::ServiceUnavailable().body("Base de données indisponible."),
    };
    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };
    let name = body.name.trim();
    if name.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "name requis" }));
    }
    let cards = card_cache.get();
    let validation = DeckValidationRequest {
        main: body.main.clone(),
        extra: body.extra.clone(),
        side: body.side.clone(),
    };
    let response = validation.validate_for_save(&cards);
    if !response.valid {
        return HttpResponse::BadRequest().json(response);
    }
    let main = body.main.as_deref().unwrap_or(&[]);
    let extra = body.extra.as_deref().unwrap_or(&[]);
    let side = body.side.as_deref().unwrap_or(&[]);
    let main_entries = match entries_to_insert(&cards, main, "main") {
        Ok(v) => v,
        Err(e) => return HttpResponse::BadRequest().json(serde_json::json!({ "error": e })),
    };
    let extra_entries = match entries_to_insert(&cards, extra, "extra") {
        Ok(v) => v,
        Err(e) => return HttpResponse::BadRequest().json(serde_json::json!({ "error": e })),
    };
    let side_entries = match entries_to_insert(&cards, side, "side") {
        Ok(v) => v,
        Err(e) => return HttpResponse::BadRequest().json(serde_json::json!({ "error": e })),
    };
    let mut entries = main_entries;
    entries.extend(extra_entries);
    entries.extend(side_entries);
    let cover_name = body
        .cover_card_name
        .as_deref()
        .filter(|s| !s.trim().is_empty());
    let cover_url = body
        .cover_image_url
        .as_deref()
        .filter(|s| !s.trim().is_empty());
    match create_deck(
        pool.get_ref(),
        name,
        site_user_id,
        &entries,
        cover_name,
        cover_url,
    )
    .await
    {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({ "id": id })),
        Err(e) => {
            tracing::error!("create_deck: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Erreur base de données" }))
        }
    }
}

#[get("/decks")]
pub async fn list_decks_handler(
    session: Session,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => return HttpResponse::ServiceUnavailable().body("Base de données indisponible."),
    };
    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };
    match list_decks_for_site_user(pool.get_ref(), site_user_id).await {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(e) => {
            tracing::error!("list_decks_for_site_user: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Erreur base de données" }))
        }
    }
}

#[get("/decks/{id}")]
pub async fn get_deck_handler(
    session: Session,
    pool: Option<web::Data<sqlx::PgPool>>,
    card_cache: web::Data<CardCache>,
    path: web::Path<i32>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => return HttpResponse::ServiceUnavailable().body("Base de données indisponible."),
    };
    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };
    let id = path.into_inner();
    let cards = card_cache.get();
    match get_deck_with_entries(pool.get_ref(), id, site_user_id).await {
        Ok(Some((name, is_public, cover_card_name, cover_image_url, entries))) => {
            let deck_copy = |card_id: i64| {
                let cid = card_id as u64;
                cards
                    .iter()
                    .find(|c| c.id() == cid)
                    .map(|c| canonical_deck_passcode(c, cards.as_ref()))
                    .unwrap_or(cid)
            };
            let mut json = serde_json::json!({
                "id": id,
                "name": name,
                "is_public": is_public,
                "main": entries.iter().filter(|e| e.zone == "main").map(|e| serde_json::json!({"id": e.card_id, "deck_copy_id": deck_copy(e.card_id), "name": e.name, "quantity": e.quantity, "engine": e.engine, "categories": e.categories})).collect::<Vec<_>>(),
                "extra": entries.iter().filter(|e| e.zone == "extra").map(|e| serde_json::json!({"id": e.card_id, "deck_copy_id": deck_copy(e.card_id), "name": e.name, "quantity": e.quantity, "engine": e.engine, "categories": e.categories})).collect::<Vec<_>>(),
                "side": entries.iter().filter(|e| e.zone == "side").map(|e| serde_json::json!({"id": e.card_id, "deck_copy_id": deck_copy(e.card_id), "name": e.name, "quantity": e.quantity, "engine": e.engine, "categories": e.categories})).collect::<Vec<_>>(),
            });
            if let Some(obj) = json.as_object_mut() {
                if cover_card_name.is_some() {
                    obj.insert(
                        "cover_card_name".to_string(),
                        serde_json::json!(cover_card_name),
                    );
                }
                if cover_image_url.is_some() {
                    obj.insert(
                        "cover_image_url".to_string(),
                        serde_json::json!(cover_image_url),
                    );
                }
            }
            HttpResponse::Ok().json(json)
        }
        Ok(None) => {
            HttpResponse::NotFound().json(serde_json::json!({ "error": "Deck introuvable" }))
        }
        Err(e) => {
            tracing::error!("get_deck: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Erreur base de données" }))
        }
    }
}

#[put("/decks/{id}")]
pub async fn update_deck_handler(
    session: Session,
    pool: Option<web::Data<sqlx::PgPool>>,
    card_cache: web::Data<CardCache>,
    path: web::Path<i32>,
    body: web::Json<SaveDeckRequest>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => return HttpResponse::ServiceUnavailable().body("Base de données indisponible."),
    };
    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };
    let id = path.into_inner();
    let name = body.name.trim();
    if name.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({ "error": "name requis" }));
    }
    let cards = card_cache.get();
    let validation = DeckValidationRequest {
        main: body.main.clone(),
        extra: body.extra.clone(),
        side: body.side.clone(),
    };
    let response = validation.validate_for_save(&cards);
    if !response.valid {
        return HttpResponse::BadRequest().json(response);
    }
    let main = body.main.as_deref().unwrap_or(&[]);
    let extra = body.extra.as_deref().unwrap_or(&[]);
    let side = body.side.as_deref().unwrap_or(&[]);
    let main_entries = match entries_to_insert(&cards, main, "main") {
        Ok(v) => v,
        Err(e) => return HttpResponse::BadRequest().json(serde_json::json!({ "error": e })),
    };
    let extra_entries = match entries_to_insert(&cards, extra, "extra") {
        Ok(v) => v,
        Err(e) => return HttpResponse::BadRequest().json(serde_json::json!({ "error": e })),
    };
    let side_entries = match entries_to_insert(&cards, side, "side") {
        Ok(v) => v,
        Err(e) => return HttpResponse::BadRequest().json(serde_json::json!({ "error": e })),
    };
    let mut entries = main_entries;
    entries.extend(extra_entries);
    entries.extend(side_entries);
    let cover_name = body
        .cover_card_name
        .as_deref()
        .filter(|s| !s.trim().is_empty());
    let cover_url = body
        .cover_image_url
        .as_deref()
        .filter(|s| !s.trim().is_empty());
    match update_deck(
        pool.get_ref(),
        id,
        site_user_id,
        name,
        &entries,
        cover_name,
        cover_url,
    )
    .await
    {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "ok": true })),
        Ok(false) => {
            HttpResponse::NotFound().json(serde_json::json!({ "error": "Deck introuvable" }))
        }
        Err(e) => {
            tracing::error!("update_deck: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Erreur base de données" }))
        }
    }
}

#[delete("/decks/{id}")]
pub async fn delete_deck_handler(
    session: Session,
    pool: Option<web::Data<sqlx::PgPool>>,
    path: web::Path<i32>,
) -> HttpResponse {
    let pool = match pool {
        Some(p) => p,
        None => return HttpResponse::ServiceUnavailable().body("Base de données indisponible."),
    };
    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };
    let id = path.into_inner();
    match delete_deck(pool.get_ref(), id, site_user_id).await {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "ok": true })),
        Ok(false) => {
            HttpResponse::NotFound().json(serde_json::json!({ "error": "Deck introuvable" }))
        }
        Err(e) => {
            tracing::error!("delete_deck: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Erreur base de données" }))
        }
    }
}
