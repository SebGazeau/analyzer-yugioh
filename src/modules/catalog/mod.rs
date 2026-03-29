//! Catalogue cartes (cache, recherche, validation deck).

mod helper;
mod repository;
pub mod routes;

pub use repository::{
    card_ids_matching_locale_search, fetch_card_locales_map, find_card_id_by_locale_name,
};
pub use routes::{
    card_by_name, count, search, validate_deck, CardByNameParams, SearchParams,
};
