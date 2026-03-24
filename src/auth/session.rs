//! Helpers pour les routes protégées par session.

use actix_session::Session;
use actix_web::Error;

/// Clé de session pour l’utilisateur site (même clé que `handlers` après `POST /login` ou `/register`).
pub const SITE_USER_SESSION_KEY: &str = "site_user_pseudo";

/// Vérifie qu’une session site est présente (`site_user_pseudo`) ; sinon erreur 401.
pub fn require_session(session: &Session) -> Result<String, Error> {
    session
        .get::<String>(SITE_USER_SESSION_KEY)
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Non authentifié"))
}
