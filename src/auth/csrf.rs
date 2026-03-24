//! Jeton synchronisateur CSRF pour formulaires pilotés par session.
//!
//! Complète la politique **SameSite** (sec-08) : même origine + XSS restent des sujets distincts.

use actix_session::Session;
use actix_web::HttpResponse;
use uuid::Uuid;

pub const SESSION_CSRF_KEY: &str = "csrf_token";

/// Assure la présence d’un jeton en session et le retourne (réutilisé tant qu’il existe).
pub fn sync_csrf_token(session: &Session) -> Result<String, actix_session::SessionInsertError> {
    if let Ok(Some(t)) = session.get::<String>(SESSION_CSRF_KEY) {
        if !t.is_empty() {
            return Ok(t);
        }
    }
    let t = Uuid::new_v4().to_string();
    session.insert(SESSION_CSRF_KEY, t.clone())?;
    Ok(t)
}

/// Vérifie le jeton POST contre la session (absent ou incorrect → faux).
pub fn verify_csrf_token(session: &Session, submitted: Option<&str>) -> bool {
    let Some(sub) = submitted.filter(|s| !s.is_empty()) else {
        return false;
    };
    match session.get::<String>(SESSION_CSRF_KEY) {
        Ok(Some(expected)) => sub == expected.as_str(),
        _ => false,
    }
}

/// Réponse standard si le jeton CSRF est absent ou ne correspond pas à la session.
pub fn csrf_rejected() -> HttpResponse {
    HttpResponse::Forbidden().body("Jeton CSRF invalide ou absent.")
}

/// Invalide le jeton après une action d’authentification réussie (anti-fixation).
pub fn invalidate_csrf_token(session: &Session) {
    let _ = session.remove(SESSION_CSRF_KEY);
}
