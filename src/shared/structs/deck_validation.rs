//! DTO et logique de validation de deck pour l'API POST /validate_deck.

use serde::{Deserialize, Serialize};

use crate::shared::enums::{category::Category, engine::Engine};
use crate::shared::structs::{
    card_name::CardName,
    card_search_result::CardSearchResult,
    deck::{Deck, DeckError},
    deck_entry::DeckEntry,
    quantity::Quantity,
};

/// Format d'entrée (aligné sur l'export frontend).
#[derive(Debug, Clone, Deserialize)]
pub struct DeckValidationRequest {
    pub main: Option<Vec<DeckEntryDto>>,
    pub extra: Option<Vec<DeckEntryDto>>,
    pub side: Option<Vec<DeckEntryDto>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeckEntryDto {
    pub name: String,
    /// Passcode API (optionnel) : fusion des copies pour la règle ×3 malgré variantes de nom.
    #[serde(default)]
    pub id: Option<u64>,
    #[serde(default = "default_quantity")]
    pub quantity: u8,
    #[serde(default)]
    pub engine: Option<String>,
    #[serde(default)]
    pub categories: Option<Vec<String>>,
}

fn default_quantity() -> u8 {
    1
}

/// Réponse de validation.
#[derive(Debug, Clone, Serialize)]
pub struct DeckValidationResponse {
    pub valid: bool,
    pub errors: Vec<String>,
    pub main_count: u32,
    pub extra_count: u32,
    pub side_count: u32,
}

#[derive(Debug, Clone, thiserror::Error)]
pub enum DeckValidationError {
    #[error("nom de carte vide")]
    EmptyCardName,
    #[error("quantité invalide: {0} (doit être 1, 2 ou 3)")]
    InvalidQuantity(u8),
    #[error(transparent)]
    Deck(#[from] DeckError),
}

impl DeckValidationRequest {
    /// Valide le deck et retourne la réponse.
    pub fn validate(self, cards: &[CardSearchResult]) -> DeckValidationResponse {
        let mut errors = Vec::new();
        let main_entries =
            self.parse_entries(self.main.as_deref().unwrap_or(&[]), "main", &mut errors);
        let extra_entries =
            self.parse_entries(self.extra.as_deref().unwrap_or(&[]), "extra", &mut errors);
        let side_entries =
            self.parse_entries(self.side.as_deref().unwrap_or(&[]), "side", &mut errors);

        let main_count: u32 = main_entries
            .iter()
            .map(|e| e.quantity().as_u8() as u32)
            .sum();
        let extra_count: u32 = extra_entries
            .iter()
            .map(|e| e.quantity().as_u8() as u32)
            .sum();
        let side_count: u32 = side_entries
            .iter()
            .map(|e| e.quantity().as_u8() as u32)
            .sum();

        if !errors.is_empty() {
            return DeckValidationResponse {
                valid: false,
                errors,
                main_count,
                extra_count,
                side_count,
            };
        }

        if let Err(e) = Deck::main_deck(main_entries, cards) {
            errors.push(e.to_string());
        }
        if let Err(e) = Deck::extra_deck(extra_entries, cards) {
            errors.push(e.to_string());
        }
        if let Err(e) = Deck::side_deck(side_entries, cards) {
            errors.push(e.to_string());
        }

        DeckValidationResponse {
            valid: errors.is_empty(),
            errors,
            main_count,
            extra_count,
            side_count,
        }
    }

    /// Validation pour la sauvegarde : pas de minimum en main (liste incomplète autorisée).
    pub fn validate_for_save(self, cards: &[CardSearchResult]) -> DeckValidationResponse {
        let mut errors = Vec::new();
        let main_entries =
            self.parse_entries(self.main.as_deref().unwrap_or(&[]), "main", &mut errors);
        let extra_entries =
            self.parse_entries(self.extra.as_deref().unwrap_or(&[]), "extra", &mut errors);
        let side_entries =
            self.parse_entries(self.side.as_deref().unwrap_or(&[]), "side", &mut errors);

        let main_count: u32 = main_entries
            .iter()
            .map(|e| e.quantity().as_u8() as u32)
            .sum();
        let extra_count: u32 = extra_entries
            .iter()
            .map(|e| e.quantity().as_u8() as u32)
            .sum();
        let side_count: u32 = side_entries
            .iter()
            .map(|e| e.quantity().as_u8() as u32)
            .sum();

        if !errors.is_empty() {
            return DeckValidationResponse {
                valid: false,
                errors,
                main_count,
                extra_count,
                side_count,
            };
        }

        if let Err(e) = Deck::main_deck_allow_incomplete(main_entries, cards) {
            errors.push(e.to_string());
        }
        if let Err(e) = Deck::extra_deck(extra_entries, cards) {
            errors.push(e.to_string());
        }
        if let Err(e) = Deck::side_deck(side_entries, cards) {
            errors.push(e.to_string());
        }

        DeckValidationResponse {
            valid: errors.is_empty(),
            errors,
            main_count,
            extra_count,
            side_count,
        }
    }

    fn parse_entries(
        &self,
        dtos: &[DeckEntryDto],
        section: &str,
        errors: &mut Vec<String>,
    ) -> Vec<DeckEntry> {
        let mut entries = Vec::with_capacity(dtos.len());
        for (i, dto) in dtos.iter().enumerate() {
            match parse_entry(dto) {
                Ok(entry) => entries.push(entry),
                Err(e) => errors.push(format!("{}[{}]: {}", section, i, e)),
            }
        }
        entries
    }
}

fn parse_entry(dto: &DeckEntryDto) -> Result<DeckEntry, DeckValidationError> {
    let name = dto.name.trim();
    if name.is_empty() {
        return Err(DeckValidationError::EmptyCardName);
    }
    let card_name =
        CardName::try_from(name.to_string()).map_err(|_| DeckValidationError::EmptyCardName)?;
    let quantity = Quantity::try_from(dto.quantity)
        .map_err(|_| DeckValidationError::InvalidQuantity(dto.quantity))?;
    let engine = dto
        .engine
        .as_deref()
        .and_then(|s| Engine::try_from(s).ok())
        .unwrap_or(Engine::Engine1);
    let categories: Vec<Category> = dto
        .categories
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .filter_map(|s| Category::try_from(s.as_str()).ok())
        .collect();
    let passcode = dto.id.filter(|&id| id > 0);
    Ok(DeckEntry::new(
        card_name, quantity, engine, categories, passcode,
    ))
}
