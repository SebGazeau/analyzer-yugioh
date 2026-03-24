//! Authentification : JWT (API), sessions (web), admin (email/mot de passe en base).

pub mod admin_db;
pub mod api;
pub mod csrf;
pub mod jwt;
pub mod session;
pub mod user_db;
pub mod web;

pub use api::{ApiDoc, api_scope};
pub use jwt::{Claims, JwtClaims, JwtSecret, create_token};
pub use session::require_session;
