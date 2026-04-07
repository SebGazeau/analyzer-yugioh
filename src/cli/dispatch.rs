//! Dispatch des sous-commandes CLI (sans serveur HTTP).
//!
//! Chaque branche initialise `tracing` dans son propre `run()` ; le serveur n’appelle pas ce module.

use super::{konami_pack_index, locales_konami, locales_ygo, migrate, sync_cards};

/// Exécute `argv[1]` si c’est une sous-commande connue.
///
/// - `Some(Ok(()))` : sous-commande terminée avec succès — le binaire doit quitter avec `Ok(())`.
/// - `Some(Err(e))` : échec — propager.
/// - `None` : pas de sous-commande reconnue — poursuivre avec le démarrage du serveur HTTP.
pub async fn run_subcommand_if_present() -> Option<std::io::Result<()>> {
    match std::env::args().nth(1).as_deref() {
        Some("migrate") => Some(migrate::run().await),
        Some("sync-cards") => Some(sync_cards::run().await),
        Some("konami-pack-index") => Some(konami_pack_index::run().await),
        Some("sync-locales-ygo") => Some(locales_ygo::run().await),
        Some("sync-locales-konami") => Some(locales_konami::run().await),
        _ => None,
    }
}
