//! Decks persistés (`site_users`) : CRUD HTTP + helpers de résolution d’entrées.

mod helper;
mod repository;
pub mod routes;

pub use helper::require_site_user_id;
pub use repository::count_decks_for_site_user;
pub use routes::{
    SaveDeckRequest, create_deck_handler, delete_deck_handler, get_deck_handler,
    list_decks_handler, update_deck_handler,
};
