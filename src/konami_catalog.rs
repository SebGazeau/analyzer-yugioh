//! Données **catalogue** du site officiel Konami (`db.yugioh-card.com`).
//!
//! - **Pas** de remplacement de l’API YGOProDeck pour le cœur métier (`sync-cards`).
//! - Utile pour l’**index des packs** officiels, extensions futures (cartes par pack), ou croisement avec `cards`.
//!
//! Le HTML du site peut changer : en cas d’échec de parse, le job échoue explicitement (à monitorer).

mod config;
mod error;
mod http;
mod scrape;
mod sync;

pub use config::{KONAMI_SITE_BASE, pack_list_url};
pub use error::KonamiCatalogError;
pub use scrape::{
    absolute_konami_url, parse_card_detail_passcode_desc, parse_pack_index_html,
    parse_pack_listing_card_rows,
};
pub use sync::{KonamiLocaleSyncStats, sync_pack_card_locales, sync_pack_index};

#[cfg(test)]
mod tests {
    use super::{
        KONAMI_SITE_BASE, absolute_konami_url, parse_card_detail_passcode_desc,
        parse_pack_index_html, parse_pack_listing_card_rows,
    };

    /// Fixtures HTML : `tests/fixtures/konami_*.html` (évite les gros littéraux inline dans ce fichier).

    #[test]
    fn parse_minimal_html() {
        let html = include_str!("../tests/fixtures/konami_pack_index_minimal.html");
        let p = parse_pack_index_html(html).unwrap();
        assert_eq!(p.len(), 2);
        assert_eq!(p[0].0, "Starter Deck A");
        assert!(p[0].1.contains("foo.action"));
    }

    #[test]
    fn absolute_url_appends_request_locale() {
        let u = absolute_konami_url("/yugiohdb/x.action?a=1", "fr");
        assert!(u.starts_with(KONAMI_SITE_BASE));
        assert!(u.contains("request_locale=fr"));
    }

    #[test]
    fn parse_pack_listing_minimal() {
        let html = include_str!("../tests/fixtures/konami_pack_listing_minimal.html");
        let rows = parse_pack_listing_card_rows(html).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, "Ma carte");
        assert!(rows[0].1.contains("card.action"));
    }

    #[test]
    fn parse_detail_passcode_and_desc() {
        let html = include_str!("../tests/fixtures/konami_card_detail_minimal.html");
        let (pc, desc) = parse_card_detail_passcode_desc(html);
        assert_eq!(pc, Some(87_654_321));
        assert!(desc.contains("Effet"));
    }
}
