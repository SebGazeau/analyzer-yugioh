//! Opérations lourdes admin : API cartes, reload cache, YGOrg.

pub mod routes;
pub mod service;

pub use routes::{
    apply_card_metadata_fill, enrich_ygorganization, fetch_cards, preview_card_metadata_fill,
    reload_cache_from_db,
};
