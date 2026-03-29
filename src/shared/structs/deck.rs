use std::collections::HashMap;

use crate::shared::search::card_resolve::{canonical_deck_passcode, resolve_passcode_by_name};
use crate::shared::structs::{
    card_name::CardName, card_search_result::CardSearchResult, deck_entry::DeckEntry,
};

pub struct Deck {
    entries: Vec<DeckEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum CopyKey {
    Passcode(u64),
    Name(CardName),
}

impl CopyKey {
    fn for_entry(entry: &DeckEntry, cards: &[CardSearchResult]) -> Self {
        let raw_id = entry
            .passcode()
            .or_else(|| resolve_passcode_by_name(cards, entry.card_name().as_str()));
        if let Some(id) = raw_id {
            let canon = cards
                .iter()
                .find(|c| c.id() == id)
                .map(|c| canonical_deck_passcode(c, cards))
                .unwrap_or(id);
            return CopyKey::Passcode(canon);
        }
        CopyKey::Name(entry.card_name().clone())
    }

    fn display_label(&self) -> String {
        match self {
            CopyKey::Passcode(id) => format!("passcode {}", id),
            CopyKey::Name(n) => n.as_str().to_string(),
        }
    }
}

impl Deck {
    pub fn main_deck(
        entries: Vec<DeckEntry>,
        cards: &[CardSearchResult],
    ) -> Result<Self, DeckError> {
        let total = count_total_cards(&entries);
        if total < 40 {
            return Err(DeckError::TooFewCards {
                expected_min: 40,
                actual: total,
            });
        }
        if total > 60 {
            return Err(DeckError::TooManyCards {
                expected_max: 60,
                actual: total,
            });
        }
        check_max_copies_per_card(&entries, cards)?;
        Ok(Self { entries })
    }

    /// Valide le main deck pour une sauvegarde (brouillon) : pas de minimum, max 60, max 3 par carte.
    pub fn main_deck_allow_incomplete(
        entries: Vec<DeckEntry>,
        cards: &[CardSearchResult],
    ) -> Result<Self, DeckError> {
        let total = count_total_cards(&entries);
        if total > 60 {
            return Err(DeckError::TooManyCards {
                expected_max: 60,
                actual: total,
            });
        }
        check_max_copies_per_card(&entries, cards)?;
        Ok(Self { entries })
    }
    pub fn extra_deck(
        entries: Vec<DeckEntry>,
        cards: &[CardSearchResult],
    ) -> Result<Self, DeckError> {
        let total = count_total_cards(&entries);
        if total > 15 {
            return Err(DeckError::TooManyCards {
                expected_max: 15,
                actual: total,
            });
        }
        check_max_copies_per_card(&entries, cards)?;
        Ok(Self { entries })
    }
    pub fn side_deck(
        entries: Vec<DeckEntry>,
        cards: &[CardSearchResult],
    ) -> Result<Self, DeckError> {
        let total = count_total_cards(&entries);
        if total > 15 {
            return Err(DeckError::TooManyCards {
                expected_max: 15,
                actual: total,
            });
        }
        check_max_copies_per_card(&entries, cards)?;
        Ok(Self { entries })
    }

    pub fn entries(&self) -> &[DeckEntry] {
        &self.entries
    }

    pub fn total_cards(&self) -> u32 {
        count_total_cards(&self.entries)
    }
}

fn check_max_copies_per_card(
    entries: &[DeckEntry],
    cards: &[CardSearchResult],
) -> Result<(), DeckError> {
    let mut counts: HashMap<CopyKey, u32> = HashMap::new();
    for entry in entries {
        let key = CopyKey::for_entry(entry, cards);
        let qty = entry.quantity().as_u8() as u32;
        *counts.entry(key).or_insert(0) += qty;
    }
    for (key, count) in counts {
        if count > 3 {
            return Err(DeckError::TooManyCopies {
                card_label: key.display_label(),
                count,
            });
        }
    }
    Ok(())
}

fn count_total_cards(entries: &[DeckEntry]) -> u32 {
    entries.iter().map(|e| e.quantity().as_u8() as u32).sum()
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum DeckError {
    #[error("expected at least {expected_min} cards, got {actual}")]
    TooFewCards { expected_min: u32, actual: u32 },
    #[error("expected at most {expected_max} cards, got {actual}")]
    TooManyCards { expected_max: u32, actual: u32 },
    #[error("card {card_label} has {count} copies (max 3)")]
    TooManyCopies { card_label: String, count: u32 },
}

#[cfg(test)]
mod tests {
    use super::{Deck, DeckError};
    use crate::shared::enums::category::Category;
    use crate::shared::enums::engine::Engine;
    use crate::shared::structs::card_name::CardName;
    use crate::shared::structs::deck_entry::DeckEntry;
    use crate::shared::structs::quantity::Quantity;

    #[test]
    fn test_deck_main_deck() {
        let entries: Vec<DeckEntry> = (1..=40)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let deck = Deck::main_deck(entries, &[]);
        assert!(deck.is_ok());
    }
    #[test]
    fn test_deck_main_deck_too_few_cards() {
        let entries: Vec<DeckEntry> = (1..=39)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let deck = Deck::main_deck(entries, &[]);
        assert!(deck.is_err());
        assert_eq!(
            deck.err().unwrap(),
            DeckError::TooFewCards {
                expected_min: 40,
                actual: 39
            }
        );
    }
    #[test]
    fn test_deck_main_deck_too_many_cards() {
        let entries: Vec<DeckEntry> = (1..=61)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let deck = Deck::main_deck(entries, &[]);
        assert!(deck.is_err());
        assert_eq!(
            deck.err().unwrap(),
            DeckError::TooManyCards {
                expected_max: 60,
                actual: 61
            }
        );
    }
    #[test]
    fn test_deck_main_deck_too_many_copies() {
        // 4 copies de "Carte 1" (4 entrées × qty 1) + 36 autres cartes = 40 cartes, mais TooManyCopies
        let mut entries: Vec<DeckEntry> = (2..=40)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        for _ in 0..4 {
            entries.push(make_entry("Carte 1", None, None));
        }
        let deck = Deck::main_deck(entries, &[]);
        assert!(deck.is_err());
        assert!(matches!(
            deck.err().unwrap(),
            DeckError::TooManyCopies { count: 4, .. }
        ));
    }
    #[test]
    fn test_deck_extra_valid() {
        let entries: Vec<DeckEntry> = (1..=15)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let deck = Deck::extra_deck(entries, &[]);
        assert!(deck.is_ok());
    }
    #[test]
    fn test_deck_extra_too_many_cards() {
        let entries: Vec<DeckEntry> = (1..=16)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let deck = Deck::extra_deck(entries, &[]);
        assert!(deck.is_err());
        assert_eq!(
            deck.err().unwrap(),
            DeckError::TooManyCards {
                expected_max: 15,
                actual: 16
            }
        );
    }
    #[test]
    fn test_deck_side_deck_valid() {
        let entries: Vec<DeckEntry> = (1..=15)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let deck = Deck::side_deck(entries, &[]);
        assert!(deck.is_ok());
    }
    #[test]
    fn test_deck_side_deck_too_many_cards() {
        let entries: Vec<DeckEntry> = (1..=16)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let deck = Deck::side_deck(entries, &[]);
        assert!(deck.is_err());
        assert_eq!(
            deck.err().unwrap(),
            DeckError::TooManyCards {
                expected_max: 15,
                actual: 16
            }
        );
    }

    /// Deux passcodes distincts mais « always treated as » → même identité deck (limite ×3 globale).
    #[test]
    fn test_deck_main_deck_too_many_copies_treated_as_alias() {
        use crate::shared::enums::attribute::Attribute;
        use crate::shared::enums::card_type::CardType;
        use crate::shared::structs::card_search_result::CardSearchResult;

        let albaz = CardSearchResult::new(
            100,
            CardName::try_from("Fallen of Albaz".to_string()).unwrap(),
            None,
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
            None,
        );
        let white = CardSearchResult::new(
            200,
            CardName::try_from("Fallen of the White Dragon".to_string()).unwrap(),
            None,
            CardType::Monster,
            Some(Attribute::Light),
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
            Some(r#"(This card is always treated as "Fallen of Albaz".)"#.to_string()),
        );
        let cache = [albaz, white];
        let mut entries: Vec<DeckEntry> = (1..=36)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        entries.push(make_entry("Fallen of Albaz", None, Some(100)));
        entries.push(make_entry("Fallen of Albaz", None, Some(100)));
        entries.push(make_entry("Fallen of the White Dragon", None, Some(200)));
        entries.push(make_entry("Fallen of the White Dragon", None, Some(200)));
        let deck = Deck::main_deck(entries, &cache);
        assert!(deck.is_err());
        assert!(matches!(
            deck.err().unwrap(),
            DeckError::TooManyCopies { count: 4, .. }
        ));
    }

    /// Même passcode, libellés différents : la limite ×3 s’applique au total (sans cache).
    #[test]
    fn test_deck_main_deck_too_many_copies_same_passcode_two_names() {
        let mut entries: Vec<DeckEntry> = (2..=37)
            .map(|i| make_entry(&format!("Carte {}", i), None, None))
            .collect();
        let pid = 999_001_u64;
        entries.push(make_entry("Fallen Variant A", None, Some(pid)));
        entries.push(make_entry("Fallen Variant B", None, Some(pid)));
        entries.push(make_entry("Fallen Variant A", None, Some(pid)));
        entries.push(make_entry("Fallen Variant B", None, Some(pid)));
        let deck = Deck::main_deck(entries, &[]);
        assert!(deck.is_err());
        assert!(matches!(
            deck.err().unwrap(),
            DeckError::TooManyCopies { count: 4, .. }
        ));
    }

    fn make_entry(name: &str, quantity: Option<u8>, passcode: Option<u64>) -> DeckEntry {
        DeckEntry::new(
            CardName::try_from(name.to_string()).unwrap(),
            Quantity::try_from(quantity.unwrap_or(1_u8)).unwrap(),
            Engine::try_from("Engine 1").unwrap(),
            vec![Category::try_from("Starter").unwrap()],
            passcode,
        )
    }
}
