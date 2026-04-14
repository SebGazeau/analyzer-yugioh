//! Handlers HTTP télémétrie Fidraulis.

use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use actix_session::Session;
use actix_web::{HttpRequest, HttpResponse, get, post, web};
use sqlx::PgPool;

use crate::auth::csrf;
use crate::modules::decks::require_site_user_id;
use crate::shared::search::cache::CardCache;

use super::env::{self, FidraulisTelemetryMode};
use super::fingerprint::ZoneRow;
use super::repository::{self, PasscodeStatRow};
use super::rule;

const AGG_CACHE_TTL: Duration = Duration::from_secs(45);
const AGG_FETCH_CAP: i64 = 300;

struct AggCache {
    fetched_at: Instant,
    rows: Vec<PasscodeStatRow>,
}

static AGG_CACHE: OnceLock<Mutex<AggCache>> = OnceLock::new();

fn agg_cache_lock() -> &'static Mutex<AggCache> {
    AGG_CACHE.get_or_init(|| {
        Mutex::new(AggCache {
            fetched_at: Instant::now() - AGG_CACHE_TTL * 2,
            rows: Vec::new(),
        })
    })
}

fn invalidate_aggregate_cache() {
    if let Ok(mut g) = agg_cache_lock().lock() {
        g.rows.clear();
        g.fetched_at = Instant::now() - AGG_CACHE_TTL * 2;
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct PostFidraulisTelemetryBody {
    pub deck_id: i32,
    pub fingerprint: String,
    pub main: Vec<ZoneRow>,
    pub extra: Vec<ZoneRow>,
    pub side: Vec<ZoneRow>,
}

fn csrf_header_value(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("X-CSRF-Token")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// POST JSON après sauvegarde deck (session + CSRF + re-vérif serveur).
#[post("/insights/fidraulis/telemetry")]
pub async fn post_fidraulis_telemetry(
    session: Session,
    req: HttpRequest,
    pool: Option<web::Data<PgPool>>,
    card_cache: web::Data<CardCache>,
    body: web::Json<PostFidraulisTelemetryBody>,
) -> HttpResponse {
    match env::fidraulis_telemetry_mode() {
        FidraulisTelemetryMode::Disabled => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({ "error": "telemetry_disabled" }));
        }
        FidraulisTelemetryMode::LogOnly | FidraulisTelemetryMode::Persist => {}
    }

    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::ServiceUnavailable()
                .json(serde_json::json!({ "error": "database_unavailable" }));
        }
    };

    let site_user_id = match require_site_user_id(&session, pool.get_ref()).await {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    if !csrf::verify_csrf_token(&session, csrf_header_value(&req).as_deref()) {
        return csrf::csrf_rejected();
    }

    if !repository::deck_owned_by_user(pool.get_ref(), body.deck_id, site_user_id)
        .await
        .unwrap_or(false)
    {
        return HttpResponse::Forbidden().json(serde_json::json!({ "error": "deck_not_owned" }));
    }

    let cards = card_cache.get();
    let analysis = match rule::analyze(&cards, &body.main, &body.extra, &body.side) {
        Some(a) => a,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "no_fidraulis_synergy",
                "message": "Pas de Fidraulis détecté dans les zones envoyées, ou Extra sans passcodes exploitables (rien à enregistrer)."
            }));
        }
    };

    if analysis.fingerprint != body.fingerprint.trim() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "fingerprint_mismatch",
            "expected": analysis.fingerprint,
        }));
    }

    if let Ok(Some(prev)) =
        repository::get_last_fingerprint(pool.get_ref(), site_user_id, body.deck_id).await
    {
        if prev == analysis.fingerprint {
            return HttpResponse::NoContent().finish();
        }
    }

    let mut missing_cache: Vec<i64> = Vec::new();
    for z in body
        .main
        .iter()
        .chain(body.extra.iter())
        .chain(body.side.iter())
    {
        if z.passcode > 0 && z.qty > 0 && !cards.iter().any(|c| c.id() == z.passcode as u64) {
            missing_cache.push(z.passcode);
        }
    }
    missing_cache.sort_unstable();
    missing_cache.dedup();

    tracing::info!(
        target: "fidraulis_telemetry",
        deck_id = body.deck_id,
        fingerprint = %analysis.fingerprint,
        persist = matches!(env::fidraulis_telemetry_mode(), FidraulisTelemetryMode::Persist),
        cooc = ?analysis.cooccurrence_passcodes,
        verified = ?analysis.synergy_verified,
        heuristic = ?analysis.synergy_heuristic,
        missing_cache = ?missing_cache,
        "fidraulis_telemetry_post"
    );

    if matches!(
        env::fidraulis_telemetry_mode(),
        FidraulisTelemetryMode::LogOnly
    ) {
        return HttpResponse::Ok().json(serde_json::json!({
            "mode": "log",
            "accepted": {
                "cooccurrence": analysis.cooccurrence_passcodes,
                "synergy_verified": analysis.synergy_verified,
                "synergy_heuristic": analysis.synergy_heuristic,
            },
            "rejected": { "not_in_cache": missing_cache },
        }));
    }

    if let Err(e) = repository::apply_telemetry_increments(
        pool.get_ref(),
        site_user_id,
        body.deck_id,
        &analysis.fingerprint,
        &analysis.cooccurrence_passcodes,
        &analysis.synergy_verified,
        &analysis.synergy_heuristic,
    )
    .await
    {
        if repository::sqlx_is_undefined_table(&e) {
            tracing::warn!(
                target: "fidraulis_telemetry",
                "apply_telemetry_increments: tables insight absentes (migrations requises)"
            );
            return HttpResponse::ServiceUnavailable().json(serde_json::json!({
                "error": "insight_schema_missing",
                "message": "Les tables télémétrie Fidraulis ne sont pas présentes. Appliquer les migrations SQL puis réessayer."
            }));
        }
        tracing::error!("apply_telemetry_increments: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({ "error": "database" }));
    }

    invalidate_aggregate_cache();

    HttpResponse::Ok().json(serde_json::json!({
        "mode": "persist",
        "accepted": {
            "cooccurrence": analysis.cooccurrence_passcodes,
            "synergy_verified": analysis.synergy_verified,
            "synergy_heuristic": analysis.synergy_heuristic,
        },
        "rejected": { "not_in_cache": missing_cache },
    }))
}

#[derive(Debug, serde::Serialize)]
struct AggregateItem {
    passcode: i64,
    name: String,
    community_score: i64,
    cooccurrence_extra_with_fid: i64,
    synergy_verified_pass: i64,
    synergy_heuristic_pass: i64,
}

/// GET agrégats (pagination offset) + noms depuis `CardCache` ; cache mémoire court.
#[get("/insights/fidraulis/aggregate")]
pub async fn get_fidraulis_telemetry_aggregate(
    pool: Option<web::Data<PgPool>>,
    card_cache: web::Data<CardCache>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> HttpResponse {
    if matches!(
        env::fidraulis_telemetry_mode(),
        FidraulisTelemetryMode::Disabled
    ) {
        return HttpResponse::NotFound().json(serde_json::json!({ "error": "telemetry_disabled" }));
    }

    let pool = match pool {
        Some(p) => p,
        None => {
            return HttpResponse::ServiceUnavailable()
                .json(serde_json::json!({ "error": "database_unavailable" }));
        }
    };

    let limit: i64 = query
        .get("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20)
        .clamp(1, 50);
    let offset: i64 = query
        .get("offset")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
        .max(0);

    let cards = card_cache.get();
    let now = Instant::now();
    let mut full_rows: Vec<PasscodeStatRow> = Vec::new();
    {
        let cache = agg_cache_lock();
        if let Ok(g) = cache.lock() {
            if now.duration_since(g.fetched_at) < AGG_CACHE_TTL {
                full_rows = g.rows.clone();
            }
        }
    }
    if full_rows.is_empty() {
        match repository::list_aggregate_page(pool.get_ref(), AGG_FETCH_CAP, 0).await {
            Ok(rows) => {
                full_rows = rows;
                if let Ok(mut g) = agg_cache_lock().lock() {
                    g.rows = full_rows.clone();
                    g.fetched_at = now;
                }
            }
            Err(e) => {
                if repository::sqlx_is_undefined_table(&e) {
                    tracing::warn!(
                        target: "fidraulis_telemetry",
                        "list_aggregate_page: tables insight Fidraulis absentes (exécuter les migrations DB), agrégat vide"
                    );
                    full_rows = Vec::new();
                    if let Ok(mut g) = agg_cache_lock().lock() {
                        g.rows.clear();
                        g.fetched_at = now;
                    }
                } else {
                    tracing::error!("list_aggregate_page: {}", e);
                    return HttpResponse::InternalServerError()
                        .json(serde_json::json!({ "error": "database" }));
                }
            }
        }
    }

    let slice: Vec<&PasscodeStatRow> = full_rows
        .iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect();
    let mut items: Vec<AggregateItem> = Vec::with_capacity(slice.len());
    for r in slice {
        let name = cards
            .iter()
            .find(|c| c.id() == r.passcode as u64)
            .map(|c| c.as_str().to_string())
            .unwrap_or_else(|| format!("passcode {}", r.passcode));
        let score =
            r.synergy_verified_pass * 10 + r.synergy_heuristic_pass + r.cooccurrence_extra_with_fid;
        items.push(AggregateItem {
            passcode: r.passcode,
            name,
            community_score: score,
            cooccurrence_extra_with_fid: r.cooccurrence_extra_with_fid,
            synergy_verified_pass: r.synergy_verified_pass,
            synergy_heuristic_pass: r.synergy_heuristic_pass,
        });
    }

    let next_offset = if (offset + limit) < full_rows.len() as i64 {
        Some(offset + limit)
    } else {
        None
    };

    HttpResponse::Ok().json(serde_json::json!({
        "items": items,
        "next_offset": next_offset,
        "rule_version": super::fingerprint::RULE_VERSION,
    }))
}
