//! Routes admin sous `/admin/ygo` :
//! - `POST /analyze` — corps `DisplayInput`, réponse `AnalysisResult` (JSON).
//! - `POST /derive-pulls` — dérive `pull_probability` (`derive_mode`: `slot_mass` ou `case_expected_copies`).
//! - `GET /set` — chargement set YGOPRODECK (deux étapes prix).
//! - `GET /health` — smoke test (200 OK).

use std::time::Duration;

use actix_web::{HttpResponse, web};
use serde::Serialize;

use super::mapper::{build_all_versions, filter_candidates};
use super::product_model::{DerivePullsRequest, derive_pull_probabilities};
use crate::ygo_api;

async fn analyze_display_handler(body: web::Json<ygo_engine::DisplayInput>) -> HttpResponse {
    let result = ygo_engine::analyze(body.into_inner());
    HttpResponse::Ok().json(result)
}

async fn ygo_health_handler() -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/plain; charset=utf-8")
        .body("ok")
}

async fn derive_pulls_handler(body: web::Json<DerivePullsRequest>) -> HttpResponse {
    match derive_pull_probabilities(&body) {
        Ok(resp) => HttpResponse::Ok().json(resp),
        Err(e) => HttpResponse::BadRequest()
            .content_type("text/plain; charset=utf-8")
            .body(e.to_string()),
    }
}

#[derive(serde::Deserialize)]
struct SetQuery {
    name: String,
    min_price: Option<String>,
}

#[derive(Serialize)]
struct SetLoadResponse {
    set_name: String,
    cards: Vec<ygo_engine::CardData>,
    count: usize,
    min_price_filter: f64,
    warning: Option<String>,
}

fn parse_min_price_filter(raw: Option<&str>) -> Result<f64, ()> {
    match raw.map(str::trim).filter(|s| !s.is_empty()) {
        None => Ok(2.0),
        Some(s) => s.parse::<f64>().map_err(|_| ()),
    }
}

async fn ygo_set_load_handler(q: web::Query<SetQuery>) -> HttpResponse {
    let set_name = q.name.trim();
    if set_name.is_empty() {
        return HttpResponse::BadRequest()
            .content_type("text/plain; charset=utf-8")
            .body("paramètre `name` requis");
    }

    let min_price_filter = match parse_min_price_filter(q.min_price.as_deref()) {
        Ok(v) => v,
        Err(()) => {
            return HttpResponse::BadRequest()
                .content_type("text/plain; charset=utf-8")
                .body("`min_price` invalide");
        }
    };

    let cards_api = match ygo_api::fetch_cards_by_set(set_name).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(err = %e, "fetch_cards_by_set");
            return HttpResponse::BadGateway()
                .content_type("text/plain; charset=utf-8")
                .body(e.to_string());
        }
    };

    let candidates = filter_candidates(cards_api, set_name, min_price_filter);
    let mut flat: Vec<ygo_engine::CardData> = Vec::new();

    for (idx, api_card) in candidates.iter().enumerate() {
        if idx > 0 {
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        match ygo_api::fetch_card_prices(api_card.id).await {
            Ok(prices) => {
                flat.extend(build_all_versions(api_card, &prices, set_name));
            }
            Err(e) => {
                tracing::warn!(
                    passcode = api_card.id,
                    err = %e,
                    "getCardPrices: carte ignorée"
                );
            }
        }
    }

    flat.sort_by(|a, b| b.market_price.total_cmp(&a.market_price));

    let warning = if flat.is_empty() {
        Some("Set not found or no cards".to_string())
    } else {
        None
    };

    HttpResponse::Ok().json(SetLoadResponse {
        set_name: set_name.to_string(),
        count: flat.len(),
        cards: flat,
        min_price_filter,
        warning,
    })
}

pub fn register(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/ygo")
            .route("/analyze", web::post().to(analyze_display_handler))
            .route("/derive-pulls", web::post().to(derive_pulls_handler))
            .route("/set", web::get().to(ygo_set_load_handler))
            .route("/health", web::get().to(ygo_health_handler)),
    );
}
