//! Helpers pour les routes protégées par session.

use actix_session::Session;
use actix_web::Error;

/// Vérifie qu'une session a un utilisateur connecté ; sinon erreur 401.
pub fn require_session(session: &Session) -> Result<String, Error> {
    session
        .get::<String>("user_id")
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Non authentifié"))
}
