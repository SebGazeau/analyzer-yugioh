//! Scope /api : JWT + handlers token/profile + OpenAPI.
//!
//! La clé dans le corps `api_key` est comparée à **`API_ISSUER_SECRET`** si défini ;
//! sinon repli sur **`JWT_SECRET`** (même valeur que pour signer le JWT — déconseillé en prod).

use actix_web::{HttpResponse, get, post, web};
use serde::Deserialize;
use utoipa::{OpenApi, ToSchema};

use crate::auth::jwt::{JwtClaims, JwtSecret, create_token};

#[derive(Deserialize, ToSchema)]
pub struct TokenRequest {
    pub api_key: String,
}

/// Résout le secret attendu dans le corps [`TokenRequest::api_key`].
/// Retourne `(issuer, used_jwt_fallback)` : `used_jwt_fallback` si `API_ISSUER_SECRET` est absent ou vide après trim.
pub fn resolve_api_token_issuer_secret(
    api_issuer_from_env: Option<String>,
    jwt_secret_trimmed: Option<String>,
) -> (Option<String>, bool) {
    let explicit = api_issuer_from_env
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    if explicit.is_some() {
        return (explicit, false);
    }
    match jwt_secret_trimmed.filter(|s| !s.is_empty()) {
        Some(j) => (Some(j), true),
        None => (None, false),
    }
}

/// POST /api/auth/token — échange `api_key` contre un JWT (voir [`resolve_api_token_issuer_secret`]).
#[utoipa::path(
    post,
    path = "/api/auth/token",
    request_body = TokenRequest,
    responses(
        (status = 200, description = "JWT émis"),
        (status = 401, description = "Clé invalide")
    )
)]
#[post("/auth/token")]
pub async fn auth_token(
    secret: web::Data<JwtSecret>,
    body: web::Json<TokenRequest>,
    expected_issuer: web::Data<Option<String>>,
) -> HttpResponse {
    let expected = match expected_issuer.as_ref() {
        Some(k) => k,
        None => return HttpResponse::ServiceUnavailable().body("auth not configured"),
    };
    if body.api_key != *expected {
        return HttpResponse::Unauthorized().body("invalid api_key");
    }
    match create_token(secret.0.as_slice(), "api-user", "api", 24) {
        Ok(token) => HttpResponse::Ok().json(serde_json::json!({ "token": token })),
        Err(_) => HttpResponse::InternalServerError().body("token creation failed"),
    }
}

/// GET /api/profile — protégé par JWT (extracteur JwtClaims).
#[utoipa::path(
    get,
    path = "/api/profile",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Profil"),
        (status = 401, description = "Non authentifié")
    )
)]
#[get("/profile")]
pub async fn profile(claims: JwtClaims) -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "sub": claims.0.sub,
        "role": claims.0.role,
    }))
}

#[derive(OpenApi)]
#[openapi(
    paths(auth_token, profile),
    components(schemas(TokenRequest)),
    modifiers(&SecurityAddon),
)]
pub struct ApiDoc;

struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .build(),
                ),
            );
        }
    }
}

/// Scope /api unique : auth_token (public) + profile (protégé JWT).
pub fn api_scope(
    jwt_secret: web::Data<JwtSecret>,
    api_token_issuer_secret: Option<String>,
) -> actix_web::Scope {
    web::scope("/api")
        .app_data(jwt_secret)
        .app_data(web::Data::new(api_token_issuer_secret))
        .service(auth_token)
        .service(profile)
}

#[cfg(test)]
mod resolve_tests {
    use super::resolve_api_token_issuer_secret;

    #[test]
    fn explicit_issuer_wins_no_fallback() {
        let (iss, fb) = resolve_api_token_issuer_secret(
            Some("  issuer-only  ".to_string()),
            Some("jwt-signing".to_string()),
        );
        assert_eq!(iss.as_deref(), Some("issuer-only"));
        assert!(!fb);
    }

    #[test]
    fn empty_explicit_falls_back_to_jwt() {
        let (iss, fb) = resolve_api_token_issuer_secret(
            Some("   ".to_string()),
            Some("fallback-jwt".to_string()),
        );
        assert_eq!(iss.as_deref(), Some("fallback-jwt"));
        assert!(fb);
    }

    #[test]
    fn missing_explicit_uses_jwt() {
        let (iss, fb) = resolve_api_token_issuer_secret(None, Some("j".to_string()));
        assert_eq!(iss.as_deref(), Some("j"));
        assert!(fb);
    }

    #[test]
    fn no_jwt_no_issuer() {
        let (iss, fb) = resolve_api_token_issuer_secret(None, None);
        assert!(iss.is_none());
        assert!(!fb);
    }
}
