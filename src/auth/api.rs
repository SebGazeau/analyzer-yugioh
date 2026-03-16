//! Scope /api : JWT + handlers token/profile + OpenAPI.

use actix_web::{HttpResponse, get, post, web};
use serde::Deserialize;
use utoipa::{OpenApi, ToSchema};

use crate::auth::jwt::{JwtClaims, JwtSecret, create_token};

#[derive(Deserialize, ToSchema)]
pub struct TokenRequest {
    pub api_key: String,
}

/// POST /api/auth/token — échange api_key contre un JWT (si api_key == JWT_SECRET).
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
    expected_key: web::Data<Option<String>>,
) -> HttpResponse {
    let expected = match expected_key.as_ref() {
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
pub fn api_scope(jwt_secret: web::Data<JwtSecret>, api_key: Option<String>) -> actix_web::Scope {
    web::scope("/api")
        .app_data(jwt_secret)
        .app_data(web::Data::new(api_key))
        .service(auth_token)
        .service(profile)
}
