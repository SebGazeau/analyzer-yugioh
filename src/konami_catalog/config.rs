//! Constantes réseau et URLs catalogue Konami.

use std::time::Duration;

pub(super) const MAX_HTTP_ATTEMPTS: u32 = 4;
pub(super) const HTTP_TIMEOUT: Duration = Duration::from_secs(90);

/// URL liste des packs / recherche (alignée sur l’ancien scraper Python ; `?` simple).
/// Origine des pages catalogue (liste packs, pages pack, fiches cartes).
pub const KONAMI_SITE_BASE: &str = "https://www.db.yugioh-card.com";

pub fn pack_list_url(locale: &str) -> String {
    format!(
        "{KONAMI_SITE_BASE}/yugiohdb/card_list.action?clm=1&wname=CardSearch&request_locale={locale}"
    )
}
