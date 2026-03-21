//! Handlers HTTP pour les routes.

use actix_session::Session;
use actix_web::{delete, get, http::StatusCode, post, put, web, HttpResponse, Responder};
use serde::Deserialize;
use std::path::Path;

use crate::auth::user_db::{self, CreateUserError};
use crate::db;
use crate::images::ImageRepository;
use crate::shared::{
    enums::app_error::AppError,
    search::{cache::CardCache, filter::filter_cards},
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

const SESSION_SITE_USER_PSEUDO: &str = "site_user_pseudo";

#[get("/")]
pub async fn index(
    tera: web::Data<tera::Tera>,
    session: Session,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, TemplateError> {
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
    let user_pseudo: Option<String> = session.get(SESSION_SITE_USER_PSEUDO).ok().flatten();
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

#[get("/search")]
pub async fn search(
    params: web::Query<SearchParams>,
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> Result<HttpResponse, AppError> {
    let search_query = SearchQuery::new(params.q.clone())?;
    let cards = card_cache.get();
    let filtered = filter_cards(&cards, &search_query);
    let mut dto: Vec<SearchCardDto> = filtered.iter().map(|c| c.to_search_dto()).collect();
    // N'exposer que les images locales (importées) ; jamais l'URL externe.
    for d in dto.iter_mut() {
        d.image_url = None;
    }
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

fn normalize_name_for_match(s: &str) -> String {
    s.replace("&amp;", "&").replace("&#38;", "&")
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
            let mut dto = c.to_search_dto();
            dto.name = name.to_string();
            dto.image_url = None;
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
pub async fn validate_deck(deck: web::Json<DeckValidationRequest>) -> HttpResponse {
    let response = deck.into_inner().validate();
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

/// Résout un nom de carte vers son id via le cache (nom ou name_en).
fn resolve_name_to_id(
    cards: &[crate::shared::structs::card_search_result::CardSearchResult],
    name: &str,
) -> Option<u64> {
    let name_norm = normalize_name_for_match(name);
    cards.iter()
        .find(|c| {
            normalize_name_for_match(c.as_str()) == name_norm
                || c.card_name_en()
                    .map(|n| normalize_name_for_match(n.as_str()) == name_norm)
                    .unwrap_or(false)
        })
        .map(|c| c.id())
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
        let card_id = resolve_name_to_id(cards, name).ok_or_else(|| format!("Carte inconnue: {}", name))? as i64;
        let quantity = dto.quantity.clamp(1, 3) as i16;
        let engine = dto.engine.as_deref().filter(|s| !s.is_empty()).map(String::from);
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
async fn require_site_user_id(session: &Session, pool: &sqlx::PgPool) -> Result<uuid::Uuid, HttpResponse> {
    let pseudo: Option<String> = match session.get::<String>(SESSION_SITE_USER_PSEUDO) {
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
    let validation = DeckValidationRequest {
        main: body.main.clone(),
        extra: body.extra.clone(),
        side: body.side.clone(),
    };
    let response = validation.validate_for_save();
    if !response.valid {
        return HttpResponse::BadRequest().json(response);
    }
    let cards = card_cache.get();
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
    let cover_name = body.cover_card_name.as_deref().filter(|s| !s.trim().is_empty());
    let cover_url = body.cover_image_url.as_deref().filter(|s| !s.trim().is_empty());
    match db::create_deck(pool.get_ref(), name, site_user_id, &entries, cover_name, cover_url).await {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({ "id": id })),
        Err(e) => {
            tracing::error!("create_deck: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "Erreur base de données" }))
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
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "Erreur base de données" }))
        }
    }
}

#[get("/decks/{id}")]
pub async fn get_deck_handler(
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
    match db::get_deck_with_entries(pool.get_ref(), id, site_user_id).await {
        Ok(Some((name, is_public, cover_card_name, cover_image_url, entries))) => {
            let mut json = serde_json::json!({
                "id": id,
                "name": name,
                "is_public": is_public,
                "main": entries.iter().filter(|e| e.zone == "main").map(|e| serde_json::json!({"name": e.name, "quantity": e.quantity, "engine": e.engine, "categories": e.categories})).collect::<Vec<_>>(),
                "extra": entries.iter().filter(|e| e.zone == "extra").map(|e| serde_json::json!({"name": e.name, "quantity": e.quantity, "engine": e.engine, "categories": e.categories})).collect::<Vec<_>>(),
                "side": entries.iter().filter(|e| e.zone == "side").map(|e| serde_json::json!({"name": e.name, "quantity": e.quantity, "engine": e.engine, "categories": e.categories})).collect::<Vec<_>>(),
            });
            if let Some(obj) = json.as_object_mut() {
                if cover_card_name.is_some() {
                    obj.insert("cover_card_name".to_string(), serde_json::json!(cover_card_name));
                }
                if cover_image_url.is_some() {
                    obj.insert("cover_image_url".to_string(), serde_json::json!(cover_image_url));
                }
            }
            HttpResponse::Ok().json(json)
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({ "error": "Deck introuvable" })),
        Err(e) => {
            tracing::error!("get_deck: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "Erreur base de données" }))
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
    let validation = DeckValidationRequest {
        main: body.main.clone(),
        extra: body.extra.clone(),
        side: body.side.clone(),
    };
    let response = validation.validate_for_save();
    if !response.valid {
        return HttpResponse::BadRequest().json(response);
    }
    let cards = card_cache.get();
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
    let cover_name = body.cover_card_name.as_deref().filter(|s| !s.trim().is_empty());
    let cover_url = body.cover_image_url.as_deref().filter(|s| !s.trim().is_empty());
    match db::update_deck(pool.get_ref(), id, site_user_id, name, &entries, cover_name, cover_url).await {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({ "ok": true })),
        Ok(false) => HttpResponse::NotFound().json(serde_json::json!({ "error": "Deck introuvable" })),
        Err(e) => {
            tracing::error!("update_deck: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "Erreur base de données" }))
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
        Ok(false) => HttpResponse::NotFound().json(serde_json::json!({ "error": "Deck introuvable" })),
        Err(e) => {
            tracing::error!("delete_deck: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({ "error": "Erreur base de données" }))
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
}

#[derive(Debug, Deserialize)]
pub struct RegisterForm {
    pub pseudo: String,
    pub password: String,
    pub accept_conditions: Option<String>,
}

#[get("/register")]
pub async fn register_page(tera: web::Data<tera::Tera>) -> Result<HttpResponse, TemplateError> {
    let mut ctx = tera::Context::new();
    ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
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
    let pool = match pool {
        Some(p) => p,
        None => {
            let mut ctx = tera::Context::new();
            ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
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
        ctx.insert("error", &Some("Vous devez accepter les conditions d'utilisation."));
        ctx.insert("pseudo_retry", &form.pseudo);
        let body = tera.render("register.html", &ctx).map_err(TemplateError)?;
        return Ok(HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(body));
    }
    match user_db::create_user(pool.get_ref(), &form.pseudo, &form.password).await {
        Ok(_) => {
            let user = user_db::get_user_by_pseudo(pool.get_ref(), &form.pseudo).await.ok().flatten();
            if let Some(u) = user {
                let _ = session.insert(SESSION_SITE_USER_PSEUDO, u.pseudo.clone());
            }
            Ok(HttpResponse::SeeOther()
                .append_header(("Location", "/"))
                .finish())
        }
        Err(e) => {
            let msg = match &e {
                CreateUserError::Pseudo(_) => e.to_string(),
                CreateUserError::Password(_) => e.to_string(),
                CreateUserError::PseudoTaken => "Ce pseudo est déjà utilisé.".to_string(),
                CreateUserError::Hash | CreateUserError::Db(_) => "Erreur technique. Réessayez.".to_string(),
            };
            let mut ctx = tera::Context::new();
            ctx.insert("timestamp", &format!("{}", chrono::Utc::now().timestamp()));
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
    let pool = match pool {
        Some(p) => p,
        None => return HttpResponse::SeeOther().append_header(("Location", "/")).finish(),
    };
    match user_db::authenticate(pool.get_ref(), form.pseudo.trim(), &form.password).await {
        Ok(Some(user)) => {
            if session.insert(SESSION_SITE_USER_PSEUDO, user.pseudo).is_err() {
                tracing::error!("session insert failed");
            }
            HttpResponse::SeeOther().append_header(("Location", "/")).finish()
        }
        _ => {
            HttpResponse::SeeOther()
                .append_header(("Location", "/?login_error=1"))
                .finish()
        }
    }
}

#[post("/logout")]
pub async fn logout_submit(session: Session) -> HttpResponse {
    session.remove(SESSION_SITE_USER_PSEUDO);
    HttpResponse::SeeOther().append_header(("Location", "/")).finish()
}
