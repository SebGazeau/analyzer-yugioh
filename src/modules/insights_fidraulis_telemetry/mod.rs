//! Télémétrie agrégée insight Fidraulis (POST après sauvegarde + GET suggestions).

pub mod env;
pub mod fingerprint;
pub mod repository;
pub mod routes;
pub mod rule;
pub mod synergy_delta;

pub use routes::{get_fidraulis_telemetry_aggregate, post_fidraulis_telemetry};
