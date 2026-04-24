//! Espace personnel utilisateur (`/mon-compte`).

pub mod repository;
pub mod routes;

pub use routes::{account_change_password_submit, account_delete_submit, account_page};
