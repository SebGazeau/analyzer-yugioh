//! Utilitaires locaux au module decks (résolution passcode, session site).

use actix_session::Session;
use actix_web::HttpResponse;

use crate::auth::session::{SITE_USER_SESSION_EPOCH_KEY, SITE_USER_SESSION_KEY};
use crate::auth::user_db;
use crate::shared::search::card_resolve::resolve_passcode_by_name;
use crate::shared::structs::card_search_result::CardSearchResult;
use crate::shared::structs::deck_validation::DeckEntryDto;

/// Convertit les entrées DTO en `DeckEntryInsert` (card_id résolu, engine et categories conservés).
pub fn entries_to_insert(
    cards: &[CardSearchResult],
    dtos: &[DeckEntryDto],
    zone: &str,
) -> Result<Vec<super::repository::DeckEntryInsert>, String> {
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
            .ok_or_else(|| format!("Carte inconnue: {name}"))? as i64;
        let quantity = dto.quantity.clamp(1, 3) as i16;
        let engine = dto
            .engine
            .as_deref()
            .filter(|s| !s.is_empty())
            .map(String::from);
        let categories = dto.categories.clone().unwrap_or_default();
        out.push(super::repository::DeckEntryInsert {
            card_id,
            zone: zone.to_string(),
            quantity,
            engine,
            categories,
        });
    }
    Ok(out)
}

/// Utilisateur connecté : pseudo en session → `site_users.id`.
pub async fn require_site_user_id(
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
    let session_epoch = session
        .get::<i64>(SITE_USER_SESSION_EPOCH_KEY)
        .ok()
        .flatten()
        .unwrap_or_default();
    if session_epoch != u.session_epoch {
        return Err(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Session expirée. Reconnectez-vous."
        })));
    }
    if u.force_enable_2fa_after_reset {
        return Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Activation 2FA requise avant cette action."
        })));
    }
    Ok(u.id)
}
