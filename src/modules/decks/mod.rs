//! Decks persistés (`site_users`) : CRUD HTTP + helpers de résolution d’entrées.

mod helper;
mod repository;
pub mod routes;

pub use routes::{
    create_deck_handler, delete_deck_handler, get_deck_handler, list_decks_handler,
    update_deck_handler, SaveDeckRequest,
};
