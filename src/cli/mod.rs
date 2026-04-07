//! Sous-commandes CLI sans serveur HTTP (`migrate`, `sync-cards`, etc.).

mod dispatch;

pub use dispatch::run_subcommand_if_present;

pub mod konami_pack_index;
pub mod locales_konami;
pub mod locales_ygo;
pub mod migrate;
pub mod sync_cards;
