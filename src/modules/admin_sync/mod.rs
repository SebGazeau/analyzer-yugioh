//! Opérations lourdes admin : API cartes, reload cache, YGOrg.

pub mod routes;

pub use routes::{enrich_ygorganization, fetch_cards, reload_cache_from_db};
