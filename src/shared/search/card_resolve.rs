//! Résolution nom → passcode (id API) alignée sur `/card` et la sauvegarde de deck.
//! Gère les alias d’exemplaires via la formulation **always treated as** dans la description
//! (ex. *Fallen of the White Dragon* → *Fallen of Albaz*, variantes *Harpy Lady*, etc.) :
//! plusieurs entrées deck possibles, une seule **somme** d’exemplaires plafonnée.

use std::sync::LazyLock;

use regex::Regex;

use crate::shared::structs::card_search_result::CardSearchResult;

/// Normalise un libellé pour comparaison (entités HTML, etc.).
pub fn normalize_name_for_match(s: &str) -> String {
    s.replace("&amp;", "&").replace("&#38;", "&")
}

/// Trouve le passcode d’une carte dans le cache (nom principal ou `name_en`).
pub fn resolve_passcode_by_name(cards: &[CardSearchResult], name: &str) -> Option<u64> {
    let name_norm = normalize_name_for_match(name);
    cards
        .iter()
        .find(|c| {
            normalize_name_for_match(c.as_str()) == name_norm
                || c.card_name_en()
                    .map(|n| normalize_name_for_match(n.as_str()) == name_norm)
                    .unwrap_or(false)
        })
        .map(|c| c.id())
}

static ALWAYS_TREATED_AS_DOUBLE_QUOTE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?is)always\s+treated\s+as\s*"([^"]+)""#).expect("regex"));

static ALWAYS_TREATED_AS_SINGLE_QUOTE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?is)always\s+treated\s+as\s*'([^']+)'"#).expect("regex"));

static ALWAYS_TREATED_AS_UNICODE_QUOTES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?is)always\s+treated\s+as\s*\u{201c}([^\u{201d}]+)\u{201d}").expect("regex")
});

/// Extrait le nom canon visé par l’effet « always treated as … » (règles deck construction).
pub fn parse_always_treated_as_target_name(desc: &str) -> Option<String> {
    for re in [
        &*ALWAYS_TREATED_AS_DOUBLE_QUOTE,
        &*ALWAYS_TREATED_AS_SINGLE_QUOTE,
        &*ALWAYS_TREATED_AS_UNICODE_QUOTES,
    ] {
        if let Some(cap) = re.captures(desc).and_then(|c| c.get(1)) {
            let s = cap.as_str().trim();
            if !s.is_empty() {
                return Some(s.to_string());
            }
        }
    }
    None
}

/// Passcode à utiliser pour la **limite d’exemplaires** (fusionne alias type White Dragon / Albaz).
pub fn canonical_deck_passcode(card: &CardSearchResult, cards: &[CardSearchResult]) -> u64 {
    const MAX_CHAIN: u8 = 8;
    let mut current_id = card.id();
    let mut visited = std::collections::HashSet::new();
    visited.insert(current_id);

    for _ in 0..MAX_CHAIN {
        let Some(c) = cards.iter().find(|cc| cc.id() == current_id) else {
            return current_id;
        };
        let Some(desc) = c.card_desc() else {
            return current_id;
        };
        let Some(target_name) = parse_always_treated_as_target_name(desc) else {
            return current_id;
        };
        let Some(next_id) = resolve_passcode_by_name(cards, &target_name) else {
            return current_id;
        };
        if visited.contains(&next_id) {
            return current_id;
        }
        visited.insert(next_id);
        current_id = next_id;
    }
    current_id
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::enums::{attribute::Attribute, card_type::CardType};
    use crate::shared::structs::card_name::CardName;

    fn card(id: u64, name: &str, name_en: Option<&str>, desc: Option<&str>) -> CardSearchResult {
        CardSearchResult::new(
            id,
            CardName::try_from(name.to_string()).unwrap(),
            name_en.map(|s| CardName::try_from(s.to_string()).unwrap()),
            CardType::Monster,
            Some(Attribute::Dark),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            desc.map(String::from),
            None,
        )
    }

    #[test]
    fn parse_fallen_white_dragon_treated_as_albaz() {
        let desc = r#"(This card is always treated as "Fallen of Albaz".)"#;
        assert_eq!(
            parse_always_treated_as_target_name(desc).as_deref(),
            Some("Fallen of Albaz")
        );
    }

    #[test]
    fn canonical_maps_white_dragon_to_albaz_passcode() {
        let albaz = card(68468459, "Fallen of Albaz", None, None);
        let white = card(
            99988877,
            "Fallen of the White Dragon",
            None,
            Some(r#"(This card is always treated as "Fallen of Albaz".)"#),
        );
        let cards = [albaz.clone(), white.clone()];
        assert_eq!(canonical_deck_passcode(&white, &cards), 68468459);
        assert_eq!(canonical_deck_passcode(&albaz, &cards), 68468459);
    }
}
