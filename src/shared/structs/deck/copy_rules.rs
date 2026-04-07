//! Règle « max 3 exemplaires » par identité carte (passcode canonique ou nom).

use std::collections::HashMap;

use crate::shared::search::card_resolve::{canonical_deck_passcode, resolve_passcode_by_name};
use crate::shared::structs::{
    card_name::CardName, card_search_result::CardSearchResult, deck_entry::DeckEntry,
};

use super::DeckError;

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
            CopyKey::Passcode(id) => format!("passcode {id}"),
            CopyKey::Name(n) => n.as_str().to_string(),
        }
    }
}

pub(super) fn check_max_copies_per_card(
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
