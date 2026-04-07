//! Vérification d’accès admin : clé `X-Admin-Key`, JWT rôle admin, session cookie.

use actix_session::Session;
use actix_session::SessionExt;
use actix_web::HttpRequest;
use actix_web::dev::ServiceRequest;
use actix_web::http::header;

use crate::auth::jwt::decode_token;

pub(crate) const ADMIN_JWT_ROLE: &str = "admin";

/// Extrait la valeur de **`X-Admin-Key`** (trim, non vide). Aucune lecture du query string (sec-04).
pub fn x_admin_key_from_headers(headers: &header::HeaderMap) -> Option<String> {
    headers
        .get("x-admin-key")
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
}

/// Extrait la clé admin depuis le header `X-Admin-Key` ([`ServiceRequest`]).
pub fn admin_key_from_request(req: &ServiceRequest) -> Option<String> {
    x_admin_key_from_headers(req.headers())
}

/// Extrait la clé admin depuis le header `X-Admin-Key` ([`HttpRequest`]).
pub fn admin_key_from_http(req: &HttpRequest) -> Option<String> {
    x_admin_key_from_headers(req.headers())
}

/// Comme [`is_admin_authorized`] pour une requête handler ([`HttpRequest`]).
pub fn is_admin_authorized_http(req: &HttpRequest, secret: &Option<String>) -> bool {
    match secret {
        None => true,
        Some(s) => admin_key_from_http(req)
            .as_deref()
            .map(|k| k == s.as_str())
            .unwrap_or(false),
    }
}

/// Bearer depuis [`HttpRequest`].
pub fn bearer_token_from_http(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer ").map(str::trim))
        .filter(|s| !s.is_empty())
        .map(String::from)
}

/// Routes hors `/admin` qui exigent un contrôle équivalent : clé, JWT admin, ou session admin.
pub fn is_privileged_admin_request(
    req: &HttpRequest,
    session: &Session,
    secret: &Option<String>,
) -> bool {
    if is_admin_authorized_http(req, secret) {
        return true;
    }
    if let Some(s) = secret {
        if let Some(token) = bearer_token_from_http(req) {
            if decode_token(s.as_bytes(), &token)
                .map(|c| c.role == ADMIN_JWT_ROLE)
                .unwrap_or(false)
            {
                return true;
            }
        }
    }
    session
        .get::<bool>("admin_authenticated")
        .ok()
        .flatten()
        .unwrap_or(false)
}

/// Retourne true si l'accès admin est autorisé (pas de secret configuré, ou clé valide en header `X-Admin-Key`).
pub fn is_admin_authorized(req: &ServiceRequest, secret: &Option<String>) -> bool {
    match secret {
        None => true,
        Some(s) => admin_key_from_request(req)
            .as_deref()
            .map(|k| k == s.as_str())
            .unwrap_or(false),
    }
}

/// Extrait le token Bearer depuis le header Authorization.
fn bearer_token_from_request(req: &ServiceRequest) -> Option<String> {
    req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer ").map(str::trim))
        .filter(|s| !s.is_empty())
        .map(String::from)
}

/// Retourne true si la requête doit être autorisée : chemin login/setup (formulaire public), clé valide, JWT admin, ou session admin.
/// GET/POST /admin/setup sont autorisés sans clé : la protection se fait côté POST via le champ "clé de setup" du formulaire.
pub fn is_admin_allowed(req: &ServiceRequest, secret: &Option<String>) -> bool {
    let path = req.path();
    if path == "/admin" || path == "/admin/login" || path == "/admin/setup" {
        return true;
    }
    if is_admin_authorized(req, secret) {
        return true;
    }
    if let Some(s) = secret {
        if let Some(token) = bearer_token_from_request(req) {
            if decode_token(s.as_bytes(), &token)
                .map(|c| c.role == ADMIN_JWT_ROLE)
                .unwrap_or(false)
            {
                return true;
            }
        }
    }
    let session = req.get_session();
    session
        .get::<bool>("admin_authenticated")
        .ok()
        .flatten()
        .unwrap_or(false)
}

#[cfg(test)]
mod admin_key_tests {
    use super::x_admin_key_from_headers;
    use actix_web::http::header::{HeaderMap, HeaderValue};

    fn header_map_with(key: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(
            actix_web::http::header::HeaderName::from_static("x-admin-key"),
            HeaderValue::from_str(key).unwrap(),
        );
        h
    }

    #[test]
    fn x_admin_key_reads_header() {
        let h = header_map_with("my-secret");
        assert_eq!(x_admin_key_from_headers(&h).as_deref(), Some("my-secret"));
    }

    #[test]
    fn x_admin_key_trims_value() {
        let h = header_map_with("  abc  ");
        assert_eq!(x_admin_key_from_headers(&h).as_deref(), Some("abc"));
    }

    #[test]
    fn x_admin_key_missing_returns_none() {
        let h = HeaderMap::new();
        assert!(x_admin_key_from_headers(&h).is_none());
    }

    #[test]
    fn x_admin_key_whitespace_only_returns_none() {
        let h = header_map_with("   ");
        assert!(x_admin_key_from_headers(&h).is_none());
    }
}
