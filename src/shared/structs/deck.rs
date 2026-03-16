use std::collections::HashMap;

use crate::shared::enums::category::Category;
use crate::shared::enums::engine::Engine;
use crate::shared::structs::{card_name::CardName, deck_entry::DeckEntry, quantity::Quantity};

pub struct Deck {
    entries: Vec<DeckEntry>,
}

impl Deck {
    pub fn main_deck(entries: Vec<DeckEntry>) -> Result<Self, DeckError> {
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
        check_max_copies_per_card(&entries)?;
        Ok(Self { entries })
    }

    /// Valide le main deck pour une sauvegarde (brouillon) : pas de minimum, max 60, max 3 par carte.
    pub fn main_deck_allow_incomplete(entries: Vec<DeckEntry>) -> Result<Self, DeckError> {
        let total = count_total_cards(&entries);
        if total > 60 {
            return Err(DeckError::TooManyCards {
                expected_max: 60,
                actual: total,
            });
        }
        check_max_copies_per_card(&entries)?;
        Ok(Self { entries })
    }
    pub fn extra_deck(entries: Vec<DeckEntry>) -> Result<Self, DeckError> {
        let total = count_total_cards(&entries);
        if total > 15 {
            return Err(DeckError::TooManyCards {
                expected_max: 15,
                actual: total,
            });
        }
        check_max_copies_per_card(&entries)?;
        Ok(Self { entries })
    }
    pub fn side_deck(entries: Vec<DeckEntry>) -> Result<Self, DeckError> {
        let total = count_total_cards(&entries);
        if total > 15 {
            return Err(DeckError::TooManyCards {
                expected_max: 15,
                actual: total,
            });
        }
        check_max_copies_per_card(&entries)?;
        Ok(Self { entries })
    }

    pub fn entries(&self) -> &[DeckEntry] {
        &self.entries
    }

    pub fn total_cards(&self) -> u32 {
        count_total_cards(&self.entries)
    }
}

fn check_max_copies_per_card(entries: &[DeckEntry]) -> Result<(), DeckError> {
    let mut counts: HashMap<CardName, u32> = HashMap::new();
    for entry in entries {
        let name = entry.card_name().clone();
        let qty = entry.quantity().as_u8() as u32;
        *counts.entry(name).or_insert(0) += qty;
    }
    for (name, count) in counts {
        if count > 3 {
            return Err(DeckError::TooManyCopies {
                card_name: name,
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
    #[error("card {card_name} has {count} copies (max 3)")]
    TooManyCopies { card_name: CardName, count: u32 },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deck_main_deck() {
        let entries: Vec<DeckEntry> = (1..=40)
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        let deck = Deck::main_deck(entries);
        assert!(deck.is_ok());
    }
    #[test]
    fn test_deck_main_deck_too_few_cards() {
        let entries: Vec<DeckEntry> = (1..=39)
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        let deck = Deck::main_deck(entries);
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
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        let deck = Deck::main_deck(entries);
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
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        for _ in 0..4 {
            entries.push(make_entry("Carte 1", None));
        }
        let deck = Deck::main_deck(entries);
        assert!(deck.is_err());
        assert!(matches!(
            deck.err().unwrap(),
            DeckError::TooManyCopies { count: 4, .. }
        ));
    }
    #[test]
    fn test_deck_extra_valid() {
        let entries: Vec<DeckEntry> = (1..=15)
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        let deck = Deck::extra_deck(entries);
        assert!(deck.is_ok());
    }
    #[test]
    fn test_deck_extra_too_many_cards() {
        let entries: Vec<DeckEntry> = (1..=16)
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        let deck = Deck::extra_deck(entries);
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
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        let deck = Deck::side_deck(entries);
        assert!(deck.is_ok());
    }
    #[test]
    fn test_deck_side_deck_too_many_cards() {
        let entries: Vec<DeckEntry> = (1..=16)
            .map(|i| make_entry(&format!("Carte {}", i), None))
            .collect();
        let deck = Deck::side_deck(entries);
        assert!(deck.is_err());
        assert_eq!(
            deck.err().unwrap(),
            DeckError::TooManyCards {
                expected_max: 15,
                actual: 16
            }
        );
    }

    fn make_entry(name: &str, quantity: Option<u8>) -> DeckEntry {
        DeckEntry::new(
            CardName::try_from(name.to_string()).unwrap(),
            Quantity::try_from(quantity.unwrap_or(1_u8)).unwrap(),
            Engine::try_from("Engine 1").unwrap(),
            vec![Category::try_from("Starter").unwrap()],
        )
    }
}
