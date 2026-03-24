//! Politique des cookies de session (`actix-session` / `CookieSessionStore`).
//!
//! En production : `Secure` + `SameSite=Strict` + `HttpOnly` (durcit le navigateur).
//! Hors production : pas de `Secure` (HTTP local / Docker sans TLS) + `SameSite=Lax`.

use actix_session::{SessionMiddleware, storage::CookieSessionStore};
use actix_web::cookie::{Key, SameSite};

/// Options explicites pour le cookie de session (sec-08).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SessionCookieSettings {
    pub secure: bool,
    pub same_site: SameSite,
}

impl SessionCookieSettings {
    pub fn for_production() -> Self {
        Self {
            secure: true,
            same_site: SameSite::Strict,
        }
    }

    /// HTTP classique (localhost, docker-compose) : le cookie doit être envoyé sans TLS.
    pub fn for_local_development() -> Self {
        Self {
            secure: false,
            same_site: SameSite::Lax,
        }
    }
}

/// Construit le middleware session avec des attributs de cookie explicites (pas de « défaut implicite »).
pub fn cookie_session_middleware(
    key: Key,
    settings: SessionCookieSettings,
) -> SessionMiddleware<CookieSessionStore> {
    SessionMiddleware::builder(CookieSessionStore::default(), key)
        .cookie_secure(settings.secure)
        .cookie_http_only(true)
        .cookie_same_site(settings.same_site)
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_is_secure_and_strict() {
        let s = SessionCookieSettings::for_production();
        assert!(s.secure);
        assert_eq!(s.same_site, SameSite::Strict);
    }

    #[test]
    fn development_allows_http_and_lax() {
        let s = SessionCookieSettings::for_local_development();
        assert!(!s.secure);
        assert_eq!(s.same_site, SameSite::Lax);
    }
}
