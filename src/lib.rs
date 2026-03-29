//! Bibliothèque pour les tests d'intégration et réutilisation.

mod app;
pub mod auth;
pub mod card_metadata_fill;
pub mod config;
pub mod db;
pub mod handlers;
pub mod images;
pub mod rate_limit;
pub mod routes;
pub mod security_startup;
pub mod session_cookies;
pub mod shared;
pub mod storage;
pub mod ygo_api;
pub mod ygorganization;

pub use app::{
    configure_app_for_tests, configure_app_for_tests_production_cookies,
    configure_app_for_tests_rate_limit_strict_site, configure_app_for_tests_with_api_keys,
    configure_app_for_tests_with_auth, configure_app_for_tests_without_swagger, make_app,
};
pub use session_cookies::SessionCookieSettings;
pub use shared::search::cache::CardCache;
