//! Helpers pour les routes protégées par session.

use actix_session::Session;
use actix_web::Error;
use uuid::Uuid;

/// Clé de session pour l’utilisateur site (même clé que `handlers` après `POST /login` ou `/register`).
pub const SITE_USER_SESSION_KEY: &str = "site_user_pseudo";
/// Clé de session pour l'id utilisateur site.
pub const SITE_USER_ID_SESSION_KEY: &str = "site_user_id";

/// Vérifie qu’une session site est présente (`site_user_pseudo`) ; sinon erreur 401.
pub fn require_session(session: &Session) -> Result<String, Error> {
    session
        .get::<String>(SITE_USER_SESSION_KEY)
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Non authentifié"))
}

/// Retourne l'utilisateur courant (id + pseudo) depuis la session.
pub fn current_user(session: &Session) -> Result<(Uuid, String), Error> {
    let user_id = session
        .get::<Uuid>(SITE_USER_ID_SESSION_KEY)
        .map_err(actix_web::error::ErrorInternalServerError)?
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Non authentifié"))?;
    let pseudo = require_session(session)?;
    Ok((user_id, pseudo))
}
