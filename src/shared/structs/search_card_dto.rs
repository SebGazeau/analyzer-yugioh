//! DTO pour la réponse API GET /search.
//! Format compatible avec le front legacy (champs `name`, `type`).

use serde::Serialize;

/// Réponse d'une carte pour l'API de recherche. Format aligné sur le front legacy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SearchCardDto {
    pub id: u64,
    /// Passcode pour la limite ×3 : identique pour les alias « always treated as » (ex. Fallen White → Albaz).
    pub deck_copy_id: u64,
    pub name: String,
    pub name_en: Option<String>,
    #[serde(rename = "type")]
    pub card_type: String,
    pub attribute: Option<String>,
    pub race: Option<String>,
    pub level: Option<u8>,
    pub archetype: Option<String>,
    pub atk: Option<i32>,
    pub def: Option<i32>,
    pub frame_type: Option<String>,
    pub ygoprodeck_url: Option<String>,
    /// URL d'affichage : image locale (/images/{id}/file/desktop) si importée, sinon URL externe (YGOProDeck).
    pub image_url: Option<String>,
    /// Liste TCG : Forbidden, Limited, Semi-Limited. Détermine le nombre max d'exemplaires en deck.
    pub ban_tcg: Option<String>,
    /// Texte d'effet / description (pour cartes associées, recherche texte).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub desc: Option<String>,
}
