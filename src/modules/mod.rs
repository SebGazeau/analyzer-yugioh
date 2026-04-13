//! Modules métier verticaux (routes + helpers / providers par domaine).
//!
//! Voir `docs/decisions.md` — découpage `handlers` / futur `db`.

pub mod admin_sync;
pub mod associations;
pub mod catalog;
pub mod decks;
pub mod pages;
pub mod site_auth;
pub mod template_error;
pub mod ygo;

/// Chemin par défaut pour `cards.json` (mode sans Postgres).
pub const CARDS_PATH_DEFAULT: &str = "legacy/assets/cards.json";
