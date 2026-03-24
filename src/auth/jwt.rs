//! JWT : Claims, création de token, extracteur pour routes protégées.

use actix_web::{Error, FromRequest, HttpRequest, dev::Payload};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

/// Payload du JWT (extrait via `JwtClaims` sur les routes protégées).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // identifiant utilisateur
    pub exp: usize,  // expiration
    pub role: String,
}

/// Règles de décodage communes (Bearer, routes admin, etc.) : **HS256 uniquement**, signature
/// vérifiée, claim `exp` requise (voir `jsonwebtoken::Validation::new`).
fn jwt_decoding_validation() -> Validation {
    Validation::new(Algorithm::HS256)
}

/// Décode et valide un JWT avec le secret donné.
pub fn decode_token(secret: &[u8], token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
        &jwt_decoding_validation(),
    )
    .map(|data| data.claims)
}

/// Crée un JWT signé. En prod, utiliser une durée et un secret depuis la config.
pub fn create_token(
    secret: &[u8],
    sub: &str,
    role: &str,
    valid_hours: i64,
) -> Result<String, jsonwebtoken::errors::Error> {
    let exp = (Utc::now() + Duration::hours(valid_hours)).timestamp() as usize;
    let claims = Claims {
        sub: sub.to_owned(),
        exp,
        role: role.to_owned(),
    };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret),
    )
}

/// Extracteur : lit `Authorization: Bearer <token>`, décode le JWT et retourne les Claims.
/// Sinon 401.
pub struct JwtClaims(pub Claims);

impl FromRequest for JwtClaims {
    type Error = Error;
    type Future = std::future::Ready<Result<Self, Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let secret = match req.app_data::<actix_web::web::Data<JwtSecret>>() {
            Some(d) => d.0.as_slice(),
            None => {
                return std::future::ready(Err(actix_web::error::ErrorInternalServerError(
                    "JWT secret non configuré",
                )));
            }
        };
        let token = req
            .headers()
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(str::to_owned);
        let result = match token {
            Some(t) => decode::<Claims>(
                &t,
                &DecodingKey::from_secret(secret),
                &jwt_decoding_validation(),
            )
            .map(|data| JwtClaims(data.claims))
            .map_err(|_| actix_web::error::ErrorUnauthorized("Token invalide")),
            None => Err(actix_web::error::ErrorUnauthorized("Token manquant")),
        };
        std::future::ready(result)
    }
}

/// Secret pour signer/vérifier les JWT (injecté en app_data).
#[derive(Clone)]
pub struct JwtSecret(pub Vec<u8>);

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::errors::ErrorKind;
    use jsonwebtoken::{EncodingKey, Header, encode};

    #[test]
    fn create_token_roundtrip() {
        let secret = b"test-secret-at-least-32-bytes-long!!!!";
        let token = create_token(secret, "user-1", "api", 24).unwrap();
        assert!(!token.is_empty());
        let claims = decode_token(secret, &token).unwrap();
        assert_eq!(claims.sub, "user-1");
        assert_eq!(claims.role, "api");
        assert!(claims.exp > (Utc::now().timestamp() as usize));
    }

    #[test]
    fn create_token_different_secret_fails_decode() {
        let secret = b"secret-a";
        let other = b"secret-b";
        let token = create_token(secret, "u", "r", 1).unwrap();
        assert!(decode_token(other, &token).is_err());
    }

    #[test]
    fn decode_rejects_expired_token() {
        let secret = b"test-secret-at-least-32-bytes-long!!!!";
        let token = create_token(secret, "u", "api", -48).unwrap();
        let err = decode_token(secret, &token).unwrap_err();
        assert!(matches!(err.kind(), ErrorKind::ExpiredSignature));
    }

    #[test]
    fn decode_rejects_non_hs256_algorithm() {
        let secret = b"test-secret-at-least-32-bytes-long!!!!";
        let exp = (Utc::now() + Duration::hours(1)).timestamp() as usize;
        let claims = Claims {
            sub: "u".to_owned(),
            exp,
            role: "api".to_owned(),
        };
        let token = encode(
            &Header::new(Algorithm::HS512),
            &claims,
            &EncodingKey::from_secret(secret),
        )
        .unwrap();
        let err = decode_token(secret, &token).unwrap_err();
        assert!(matches!(err.kind(), ErrorKind::InvalidAlgorithm));
    }
}
