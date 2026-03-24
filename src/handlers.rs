//! Handlers HTTP pour les routes.

use actix_session::Session;
use actix_web::{HttpResponse, Responder, delete, get, http::StatusCode, post, put, web};
use serde::Deserialize;
use std::path::Path;

use crate::auth::csrf;
use crate::auth::session::SITE_USER_SESSION_KEY;
use crate::auth::user_db::{self, CreateUserError};
use crate::db;
use crate::images::ImageRepository;
use crate::shared::{
    enums::app_error::AppError,
    search::{
        cache::CardCache,
        card_resolve::{
            canonical_deck_passcode, normalize_name_for_match, resolve_passcode_by_name,
        },
        filter::filter_cards,
    },
    structs::{
        deck_validation::{DeckEntryDto, DeckValidationRequest},
        search_card_dto::SearchCardDto,
        search_query::SearchQuery,
    },
};

pub const CARDS_PATH_DEFAULT: &str = "legacy/assets/cards.json";
const CARDS_API_URL: &str = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
}

#[derive(Debug, Deserialize)]
pub struct CardByNameParams {
    pub name: String,
}

#[derive(Debug)]
pub struct TemplateError(tera::Error);
impl std::fmt::Display for TemplateError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
impl actix_web::ResponseError for TemplateError {
    fn status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).body(self.0.to_string())
    }
}

#[get("/")]
pub async fn index(
    tera: web::Data<tera::Tera>,
    session: Session,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, TemplateError> {
    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (index): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    ctx.insert("csrf_token", &csrf_token);
    let user_pseudo: Option<String> = session.get(SITE_USER_SESSION_KEY).ok().flatten();
    ctx.insert("user_pseudo", &user_pseudo);
    let login_error = query.get("login_error").is_some();
    ctx.insert("login_error", &login_error);
    let body = tera.render("index.html", &ctx).map_err(TemplateError)?;
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body))
}

#[get("/count")]
pub async fn count(card_cache: web::Data<CardCache>) -> impl Responder {
    let count = card_cache.get().len();
    HttpResponse::Ok().body(count.to_string())
}

#[get("/fetch_cards")]
pub async fn fetch_cards(
    card_cache: web::Data<CardCache>,
    cards_path: web::Data<String>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let response = match reqwest::get(CARDS_API_URL).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("fetch_cards: erreur requête API: {}", e);
            return HttpResponse::InternalServerError().body(format!("Erreur API: {}", e));
        }
    };
    let json: serde_json::Value = match response.json().await {
        Ok(j) => j,
        Err(e) => {
            eprintln!("fetch_cards: erreur JSON: {}", e);
            return HttpResponse::InternalServerError().body(format!("Erreur JSON: {}", e));
        }
    };

    if let Some(pool) = pool {
        let api_response: crate::ygo_api::CardsApiResponse =
            match serde_json::from_value(json.clone()) {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("fetch_cards: parse API: {}", e);
                    return HttpResponse::InternalServerError().body(format!("Parse API: {}", e));
                }
            };
        let rows: Vec<crate::ygo_api::CardUpsertRow> = api_response
            .data
            .iter()
            .map(|c| c.to_upsert_row())
            .collect();
        if let Err(e) = db::upsert_cards(pool.get_ref(), &rows).await {
            eprintln!("fetch_cards: upsert DB: {}", e);
            return HttpResponse::InternalServerError().body(format!("Upsert DB: {}", e));
        }
        let set_rows: Vec<crate::ygo_api::CardSetUpsertRow> = api_response
            .data
            .iter()
            .flat_map(|c| c.card_set_rows())
            .collect();
        if let Err(e) = db::upsert_card_sets(pool.get_ref(), &set_rows).await {
            eprintln!("fetch_cards: upsert card_sets: {}", e);
            return HttpResponse::InternalServerError().body(format!("Upsert card_sets: {}", e));
        }
        let cards = match db::load_all_cards(pool.get_ref()).await {
            Ok(c) => c,
            Err(e) => {
                eprintln!("fetch_cards: load_all_cards: {}", e);
                return HttpResponse::InternalServerError()
                    .body(format!("Rechargement cache: {}", e));
            }
        };
        card_cache.replace_with(cards);
        return HttpResponse::Ok().body("Cartes mises à jour en base et cache rechargé.");
    }

    let path = Path::new(cards_path.as_str());
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Err(e) = std::fs::write(path, json.to_string()) {
        eprintln!("fetch_cards: erreur écriture fichier: {}", e);
        return HttpResponse::InternalServerError().body(format!("Erreur écriture: {}", e));
    }
    if let Err(e) = card_cache.reload(path) {
        eprintln!("fetch_cards: erreur rechargement cache: {}", e);
        return HttpResponse::InternalServerError().body(format!("Erreur cache: {}", e));
    }
    HttpResponse::Ok().body("Cartes sauvegardées dans cards.json")
}

/// Enrichissement YGOrganization → `card_enrichment_layers` (admin uniquement, scope `/admin`).
/// Query : `mode=init|sync_index|manifest|backfill|sync_qa`, `max=1..500`.
#[get("/enrich_ygorganization")]
pub async fn enrich_ygorganization(
    pool: Option<web::Data<sqlx::PgPool>>,
    query: web::Query<crate::ygorganization::EnrichQuery>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable().body("PostgreSQL requis pour l’enrichissement.");
    };
    let client = match crate::ygorganization::build_http_client() {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::InternalServerError().body(format!("Client HTTP reqwest: {e}"));
        }
    };
    match crate::ygorganization::run_enrichment(pool.get_ref(), &client, &query).await {
        Ok(stats) => HttpResponse::Ok()
            .content_type("text/plain; charset=utf-8")
            .body(stats.to_string()),
        Err(e) => {
            let code = match &e {
                crate::ygorganization::YgOrgError::BadQuery(_)
                | crate::ygorganization::YgOrgError::RevisionNotInitialized
                | crate::ygorganization::YgOrgError::NameIndexMissing
                | crate::ygorganization::YgOrgError::BadNameIndex => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            HttpResponse::build(code)
                .content_type("text/plain; charset=utf-8")
                .body(e.to_string())
        }
    }
}

#[get("/search")]
pub async fn search(
    params: web::Query<SearchParams>,
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> Result<HttpResponse, AppError> {
    let search_query = SearchQuery::new(params.q.clone())?;
    let cards = card_cache.get();
    let filtered = filter_cards(&cards, &search_query);
    let mut dto: Vec<SearchCardDto> = filtered
        .iter()
        .map(|c| c.to_search_dto(cards.as_ref()))
        .collect();
    // Si une image a été importée en base, on préfère notre WebP (`/images/...`) ; sinon URL YGOProDeck du cache.
    if let Some(pool) = pool {
        let urls: Vec<String> = {
            let set: std::collections::HashSet<String> = filtered
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
    /// Effet EN (`cardData.en.effectText`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_effect_en: Option<String>,
    /// Effet pendule EN (`pendulumEffect`) si présent.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_pendulum_effect_en: Option<String>,
    /// Texte de lore EN (`flavorText`) si présent.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_flavor_en: Option<String>,
    /// Effet Link EN (`linkEffect`) si présent.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_link_effect_en: Option<String>,
    /// Nom officiel EN côté YGResources (`cardData.en.name`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ygorg_name_en: Option<String>,
    /// Illu. : `/images/…/mobile` si importée, sinon URL YGOProDeck du cache (pour la modal associations).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

#[get("/associations/catalog")]
pub async fn associations_catalog(
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let ygorg_map: std::collections::HashMap<i64, db::YgOrgEnCatalogFields> = match pool.as_ref() {
        Some(p) => db::ygorg_en_catalog_fields_by_card_id(p.get_ref())
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

/// Cartes du catalogue qui partagent une entrée Q&A YGOrg avec l’ancre (nécessite `card_ygorg_id_map` + `sync_qa`).
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
    let yg = match db::ygorg_internal_id_for_our_card(pool.get_ref(), cid).await {
        Ok(x) => x,
        Err(e) => {
            tracing::warn!("associations_qa_related: map: {}", e);
            return HttpResponse::Ok().json(empty);
        }
    };
    let Some(yid) = yg else {
        return HttpResponse::Ok().json(empty);
    };
    let ids = match db::list_our_card_ids_sharing_ygorg_qa_with(pool.get_ref(), yid, cid).await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("associations_qa_related: list: {}", e);
            return HttpResponse::Ok().json(empty);
        }
    };
    let out: Vec<u64> = ids.into_iter().map(|x| x as u64).collect();
    HttpResponse::Ok().json(out)
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
    let found = cards.iter().find(|c| {
        normalize_name_for_match(c.as_str()) == name_norm
            || c.card_name_en()
                .map(|n| normalize_name_for_match(n.as_str()) == name_norm)
                .unwrap_or(false)
    });
    match found {
        Some(c) => {
            let mut dto = c.to_search_dto(cards.as_ref());
            dto.name = name.to_string();
            if let Some(pool) = pool {
                if let Some(url) = c.image_url() {
                    let url_trimmed = url.trim();
                    let urls = [url_trimmed.to_string()];
                    if let Ok(map) =
                        ImageRepository::get_ids_by_original_urls(pool.get_ref(), &urls).await
                    {
                        if let Some(id) = map.get(url_trimmed) {
                            dto.image_url = Some(format!("/images/{}/file/desktop", id));
                        }
                    }
                }
            }
            HttpResponse::Ok().json(dto)
        }
        None => HttpResponse::Ok().json(serde_json::Value::Null),
    }
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

// ---------------------------------------------------------------------------
// Decks API (POST/GET/PUT/DELETE)
// ---------------------------------------------------------------------------

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

/// Convertit les entrées DTO en DeckEntryInsert (card_id résolu, engine et categories conservés).
fn entries_to_insert(
    cards: &[crate::shared::structs::card_search_result::CardSearchResult],
    dtos: &[DeckEntryDto],
    zone: &str,
) -> Result<Vec<db::DeckEntryInsert>, String> {
    let mut out = Vec::with_capacity(dtos.len());
    for dto in dtos {
        let name = dto.name.trim();
        if name.is_empty() {
            continue;
        }
        let card_id = dto
            .id
            .filter(|&id| id > 0)
            .or_else(|| resolve_passcode_by_name(cards, name))
            .ok_or_else(|| format!("Carte inconnue: {}", name))? as i64;
        let quantity = dto.quantity.clamp(1, 3) as i16;
        let engine = dto
            .engine
            .as_deref()
            .filter(|s| !s.is_empty())
            .map(String::from);
        let categories = dto.categories.clone().unwrap_or_default();
        out.push(db::DeckEntryInsert {
            card_id,
            zone: zone.to_string(),
            quantity,
            engine,
            categories,
        });
    }
    Ok(out)
}

/// Utilisateur connecté (inscription / connexion) : pseudo en session → `site_users.id`.
async fn require_site_user_id(
    session: &Session,
    pool: &sqlx::PgPool,
) -> Result<uuid::Uuid, HttpResponse> {
    let pseudo: Option<String> = match session.get::<String>(SITE_USER_SESSION_KEY) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("session get: {}", e);
            return Err(HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Erreur session" })));
        }
    }
    .filter(|s| !s.trim().is_empty());
    let pseudo = pseudo.ok_or_else(|| {
        HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Connexion requise pour enregistrer ou gérer vos decks."
        }))
    })?;
    let user = user_db::get_user_by_pseudo(pool, &pseudo)
        .await
        .map_err(|e| {
            tracing::error!("get_user_by_pseudo: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({ "error": "Erreur base de données" }))
        })?;
    let u = user.ok_or_else(|| {
        HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Session invalide. Reconnectez-vous."
        }))
    })?;
    Ok(u.id)
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
    match db::create_deck(
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
    match db::list_decks_for_site_user(pool.get_ref(), site_user_id).await {
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
    match db::get_deck_with_entries(pool.get_ref(), id, site_user_id).await {
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
    match db::update_deck(
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
    match db::delete_deck(pool.get_ref(), id, site_user_id).await {
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

// ---------------------------------------------------------------------------
// Authentification site (inscription / connexion)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct LoginForm {
    pub pseudo: String,
    pub password: String,
    pub csrf_token: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterForm {
    pub pseudo: String,
    pub password: String,
    pub accept_conditions: Option<String>,
    pub csrf_token: Option<String>,
}

#[get("/register")]
pub async fn register_page(
    session: Session,
    tera: web::Data<tera::Tera>,
) -> Result<HttpResponse, TemplateError> {
    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (register): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    ctx.insert("csrf_token", &csrf_token);
    ctx.insert("error", &None::<String>);
    ctx.insert("pseudo_retry", "");
    let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(body))
}

#[post("/register")]
pub async fn register_submit(
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    tera: web::Data<tera::Tera>,
    form: web::Form<RegisterForm>,
) -> Result<HttpResponse, TemplateError> {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return Ok(csrf::csrf_rejected());
    }

    let csrf_token = match csrf::sync_csrf_token(&session) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("csrf sync (register post): {}", e);
            return Ok(HttpResponse::InternalServerError().finish());
        }
    };

    let pool = match pool {
        Some(p) => p,
        None => {
            let mut ctx = tera::Context::new();
            ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
            ctx.insert("csrf_token", &csrf_token);
            ctx.insert("error", &Some("Service indisponible. Réessayez plus tard."));
            ctx.insert("pseudo_retry", &form.pseudo);
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            return Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body));
        }
    };
    let accept = form.accept_conditions.as_deref() == Some("on");
    if !accept {
        let mut ctx = tera::Context::new();
        ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
        ctx.insert("csrf_token", &csrf_token);
        ctx.insert(
            "error",
            &Some("Vous devez accepter les conditions d'utilisation."),
        );
        ctx.insert("pseudo_retry", &form.pseudo);
        let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
        return Ok(HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(body));
    }
    match user_db::create_user(pool.get_ref(), &form.pseudo, &form.password).await {
        Ok(_) => {
            let user = user_db::get_user_by_pseudo(pool.get_ref(), &form.pseudo)
                .await
                .ok()
                .flatten();
            if let Some(u) = user {
                let _ = session.insert(SITE_USER_SESSION_KEY, u.pseudo.clone());
            }
            csrf::invalidate_csrf_token(&session);
            Ok(HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish())
        }
        Err(e) => {
            let msg = match &e {
                CreateUserError::Pseudo(_) => e.to_string(),
                CreateUserError::Password(_) => e.to_string(),
                CreateUserError::PseudoTaken => "Ce pseudo est déjà utilisé.".to_string(),
                CreateUserError::Hash | CreateUserError::Db(_) => {
                    "Erreur technique. Réessayez.".to_string()
                }
            };
            let mut ctx = tera::Context::new();
            ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
            ctx.insert("csrf_token", &csrf_token);
            ctx.insert("error", &Some(msg));
            ctx.insert("pseudo_retry", &form.pseudo);
            let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
            Ok(HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(body))
        }
    }
}

#[post("/login")]
pub async fn login_submit(
    pool: Option<web::Data<sqlx::PgPool>>,
    session: Session,
    form: web::Form<LoginForm>,
) -> HttpResponse {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return csrf::csrf_rejected();
    }
    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish();
        }
    };
    match user_db::authenticate(pool.get_ref(), form.pseudo.trim(), &form.password).await {
        Ok(Some(user)) => {
            if session.insert(SITE_USER_SESSION_KEY, user.pseudo).is_err() {
                tracing::error!("session insert failed");
            }
            csrf::invalidate_csrf_token(&session);
            HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish()
        }
        _ => HttpResponse::SeeOther()
            .append_header(("Location", "/?login_error=1"))
            .finish(),
    }
}

#[derive(Debug, Deserialize)]
pub struct LogoutForm {
    pub csrf_token: Option<String>,
}

#[post("/logout")]
pub async fn logout_submit(session: Session, form: web::Form<LogoutForm>) -> HttpResponse {
    if !csrf::verify_csrf_token(&session, form.csrf_token.as_deref()) {
        return csrf::csrf_rejected();
    }
    session.remove(SITE_USER_SESSION_KEY);
    csrf::invalidate_csrf_token(&session);
    HttpResponse::SeeOther()
        .append_header(("Location", "/"))
        .finish()
}
