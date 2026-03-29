//! Sync cartes / cache / enrichissement YGOrg (routes admin protégées).

use std::path::Path;

use actix_web::{get, http::StatusCode, web, HttpResponse};

use crate::cards_sync;
use crate::db;
use crate::shared::search::cache::CardCache;

#[get("/fetch_cards")]
pub async fn fetch_cards(
    card_cache: web::Data<CardCache>,
    cards_path: web::Data<String>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    if let Some(pool) = pool {
        match cards_sync::sync_from_ygoprodeck(pool.get_ref()).await {
            Ok(stats) => {
                let cards = match db::load_all_cards(pool.get_ref()).await {
                    Ok(c) => c,
                    Err(e) => {
                        eprintln!("fetch_cards: load_all_cards: {}", e);
                        return HttpResponse::InternalServerError()
                            .body(format!("Rechargement cache: {}", e));
                    }
                };
                card_cache.replace_with(cards);
                return HttpResponse::Ok().body(format!(
                    "Cartes mises à jour en base et cache rechargé. (cartes: {}, lignes sets: {}, upserts sets: {})",
                    stats.card_rows, stats.set_rows, stats.sets_affected
                ));
            }
            Err(e) => {
                eprintln!("fetch_cards: sync YGOProDeck: {}", e);
                return HttpResponse::InternalServerError().body(format!("Sync YGOProDeck: {}", e));
            }
        }
    }

    let response = match reqwest::get(cards_sync::DEFAULT_YGOPRODECK_CARDINFO_URL).await {
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

#[get("/reload_cache_from_db")]
pub async fn reload_cache_from_db(
    card_cache: web::Data<CardCache>,
    pool: Option<web::Data<sqlx::PgPool>>,
) -> HttpResponse {
    let Some(pool) = pool else {
        return HttpResponse::ServiceUnavailable()
            .content_type("text/plain; charset=utf-8")
            .body("PostgreSQL requis pour recharger le cache depuis la base.");
    };
    match db::load_all_cards(pool.get_ref()).await {
        Ok(cards) => {
            let n = cards.len();
            card_cache.replace_with(cards);
            HttpResponse::Ok()
                .content_type("text/plain; charset=utf-8")
                .body(format!("Cache rechargé depuis la base ({n} cartes)."))
        }
        Err(e) => {
            tracing::error!(error = %e, "reload_cache_from_db");
            HttpResponse::InternalServerError()
                .content_type("text/plain; charset=utf-8")
                .body(format!("Erreur lecture base: {e}"))
        }
    }
}

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
