use crate::shared::enums::{attribute::Attribute, card_type::CardType};
use crate::shared::search::card_resolve::canonical_deck_passcode;
use crate::shared::structs::{card_name::CardName, search_card_dto::SearchCardDto};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CardSearchResult {
    id: u64,
    card_name: CardName,
    card_name_en: Option<CardName>,
    card_type: CardType,
    attribute: Option<Attribute>,
    race: Option<String>,
    level: Option<u8>,
    archetype: Option<String>,
    archetype_source: Option<String>,
    atk: Option<i32>,
    def: Option<i32>,
    frame_type: Option<String>,
    ygoprodeck_url: Option<String>,
    image_url: Option<String>,
    ban_tcg: Option<String>,
    card_desc: Option<String>,
    /// Ligne `type` brute YGOProDeck (ex. « Synchro Tuner Monster »). Vide si construit hors JSON API.
    api_type_line: String,
}

impl CardSearchResult {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: u64,
        card_name: CardName,
        card_name_en: Option<CardName>,
        card_type: CardType,
        attribute: Option<Attribute>,
        race: Option<String>,
        level: Option<u8>,
        archetype: Option<String>,
        archetype_source: Option<String>,
        atk: Option<i32>,
        def: Option<i32>,
        frame_type: Option<String>,
        ygoprodeck_url: Option<String>,
        image_url: Option<String>,
        ban_tcg: Option<String>,
        card_desc: Option<String>,
        api_type_line: Option<String>,
    ) -> Self {
        Self {
            id,
            card_name,
            card_name_en,
            card_type,
            attribute,
            race,
            level,
            archetype,
            archetype_source,
            atk,
            def,
            frame_type,
            ygoprodeck_url,
            image_url,
            ban_tcg,
            card_desc,
            api_type_line: api_type_line.unwrap_or_default(),
        }
    }

    /// Ligne de type API d’origine (Synchro, Xyz, etc.), pour heuristiques serveur.
    pub fn api_type_line(&self) -> &str {
        self.api_type_line.as_str()
    }

    /// URL externe (YGOProDeck) ou None. Utilisé pour résoudre vers notre image stockée.
    pub fn image_url(&self) -> Option<&str> {
        self.image_url.as_deref()
    }

    pub fn id(&self) -> u64 {
        self.id
    }

    pub fn card_type_enum(&self) -> CardType {
        self.card_type
    }

    pub fn card_name(&self) -> &CardName {
        &self.card_name
    }

    pub fn card_name_en(&self) -> Option<&CardName> {
        self.card_name_en.as_ref()
    }

    pub fn as_str(&self) -> &str {
        self.card_name().as_str()
    }

    pub fn archetype(&self) -> Option<&str> {
        self.archetype.as_deref()
    }

    pub fn archetype_source(&self) -> Option<&str> {
        self.archetype_source.as_deref()
    }

    pub fn card_desc(&self) -> Option<&str> {
        self.card_desc.as_deref()
    }

    /// Convertit en DTO pour la réponse API (format compatible front legacy).
    pub fn to_search_dto(&self, all_cards: &[CardSearchResult]) -> SearchCardDto {
        SearchCardDto {
            id: self.id,
            deck_copy_id: canonical_deck_passcode(self, all_cards),
            name: self.card_name.as_str().to_string(),
            name_en: self.card_name_en.as_ref().map(|n| n.as_str().to_string()),
            card_type: if self.api_type_line.is_empty() {
                format!("{:?}", self.card_type)
            } else {
                self.api_type_line.clone()
            },
            attribute: self.attribute.as_ref().map(|a| format!("{a:?}")),
            race: self.race.clone(),
            level: self.level,
            archetype: self.archetype.clone(),
            archetype_source: self.archetype_source.clone(),
            atk: self.atk,
            def: self.def,
            frame_type: self.frame_type.clone(),
            ygoprodeck_url: self.ygoprodeck_url.clone(),
            image_url: self.image_url.clone(),
            ban_tcg: self.ban_tcg.clone(),
            desc: self.card_desc.clone().filter(|s| !s.trim().is_empty()),
        }
    }
}

/// Version "brute" du JSON API : tous les champs sont des types simples (String, etc.).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct RawCardSearchResult {
    pub id: u64,
    pub name: String,
    pub name_en: Option<String>,
    #[serde(rename = "type")]
    pub card_type_raw: String,
    pub attribute: Option<String>,
    pub race: Option<String>,
    pub level: Option<u8>,
    pub archetype: Option<String>,
    #[serde(default)]
    pub archetype_source: Option<String>,
    pub atk: Option<i32>,
    pub def: Option<i32>,
    #[serde(rename = "frameType")]
    pub frame_type: Option<String>,
    pub ygoprodeck_url: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub image_url_small: Option<String>,
    #[serde(default)]
    #[serde(rename = "ban_tcg")]
    pub ban_tcg: Option<String>,
    #[serde(default)]
    pub card_desc: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum CardSearchResultError {
    #[error("invalid card name: {0}")]
    InvalidCardName(String),
    #[error("invalid card name en: {0}")]
    InvalidCardNameEn(String),
    #[error("invalid card type: {0}")]
    InvalidCardType(String),
    #[error("invalid attribute: {0}")]
    InvalidAttribute(String),
    #[error("invalid race: {0}")]
    InvalidRace(String),
    #[error("invalid level: {0}")]
    InvalidLevel(String),
    #[error("invalid archetype: {0}")]
    InvalidArchetype(String),
    #[error("invalid atk: {0}")]
    InvalidAtk(String),
    #[error("invalid def: {0}")]
    InvalidDef(String),
    #[error("invalid frame type: {0}")]
    InvalidFrameType(String),
    #[error("invalid ygoprodeck url: {0}")]
    InvalidYgoprodeckUrl(String),
}

impl TryFrom<RawCardSearchResult> for CardSearchResult {
    type Error = CardSearchResultError;
    fn try_from(raw: RawCardSearchResult) -> Result<Self, Self::Error> {
        let api_type_line = raw.card_type_raw.clone();
        Ok(Self {
            id: raw.id,
            card_name: CardName::try_from(raw.name)
                .map_err(|e| CardSearchResultError::InvalidCardName(e.to_string()))?,
            card_name_en: raw
                .name_en
                .map(|s| {
                    CardName::try_from(s)
                        .map_err(|e| CardSearchResultError::InvalidCardNameEn(e.to_string()))
                })
                .transpose()?,
            card_type: CardType::try_from(api_type_line.as_str())
                .map_err(|e| CardSearchResultError::InvalidCardType(e.to_string()))?,
            attribute: raw
                .attribute
                .as_ref()
                .map(|s| {
                    Attribute::try_from(s.as_str())
                        .map_err(|e| CardSearchResultError::InvalidAttribute(e.to_string()))
                })
                .transpose()?,
            race: raw.race,
            level: raw.level,
            archetype: raw.archetype,
            archetype_source: raw.archetype_source,
            atk: raw.atk,
            def: raw.def,
            frame_type: raw.frame_type,
            ygoprodeck_url: raw.ygoprodeck_url,
            image_url: raw.image_url,
            ban_tcg: raw.ban_tcg,
            card_desc: raw.card_desc.filter(|s| !s.trim().is_empty()),
            api_type_line,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_card_search_result_new() {
        let card_name = CardName::try_from("Floraison de feu".to_string()).unwrap();
        let card_name_en = Some(CardName::try_from("Ash Blossom".to_string()).unwrap());
        let card_type = CardType::try_from("Spell").unwrap();
        let attribute = Some(Attribute::Fire);
        let race = Some("Quick-Play".to_string());
        let level = Some(1);
        let archetype = Some("Archfiend".to_string());
        let atk = Some(1000);
        let def = Some(1000);
        let frame_type = Some("Spell".to_string());
        let ygoprodeck_url = Some("https://ygoprodeck.com/card/card-name/".to_string());

        let card_search_result = CardSearchResult::new(
            1,
            card_name.clone(),
            card_name_en.clone(),
            card_type,
            attribute,
            race.clone(),
            level,
            archetype.clone(),
            None,
            atk,
            def,
            frame_type.clone(),
            ygoprodeck_url.clone(),
            None,
            None,
            None,
            None,
        );

        assert_eq!(card_search_result.id, 1);
        assert_eq!(card_search_result.card_name, card_name);
        assert_eq!(card_search_result.card_name_en, card_name_en);
        assert_eq!(card_search_result.card_type, CardType::Spell);
        assert_eq!(card_search_result.attribute, Some(Attribute::Fire));
        assert_eq!(card_search_result.race, Some("Quick-Play".to_string()));
        assert_eq!(card_search_result.level, Some(1));
        assert_eq!(card_search_result.archetype, Some("Archfiend".to_string()));
        assert_eq!(card_search_result.atk, Some(1000));
        assert_eq!(card_search_result.def, Some(1000));
        assert_eq!(card_search_result.frame_type, Some("Spell".to_string()));
        assert_eq!(
            card_search_result.ygoprodeck_url,
            Some("https://ygoprodeck.com/card/card-name/".to_string())
        );
    }

    #[test]
    fn test_to_search_dto() {
        let card_name = CardName::try_from("Floraison de feu".to_string()).unwrap();
        let card_name_en = Some(CardName::try_from("Ash Blossom".to_string()).unwrap());
        let card_type = CardType::try_from("Spell").unwrap();
        let attribute = Some(Attribute::Fire);
        let race = Some("Quick-Play".to_string());
        let level = Some(1);
        let archetype = Some("Archfiend".to_string());
        let atk = Some(1000);
        let def = Some(1000);
        let frame_type = Some("Spell".to_string());
        let ygoprodeck_url = Some("https://ygoprodeck.com/card/card-name/".to_string());

        let card_search_result = CardSearchResult::new(
            1,
            card_name.clone(),
            card_name_en.clone(),
            card_type,
            attribute,
            race.clone(),
            level,
            archetype.clone(),
            Some("ygorg_effect_en".to_string()),
            atk,
            def,
            frame_type.clone(),
            ygoprodeck_url.clone(),
            None,
            None,
            None,
            None,
        );
        let slice = std::slice::from_ref(&card_search_result);
        let search_dto = card_search_result.to_search_dto(slice);
        assert_eq!(search_dto.id, 1);
        assert_eq!(search_dto.deck_copy_id, 1);
        assert_eq!(search_dto.name, "Floraison de feu");
        assert_eq!(search_dto.name_en, Some("Ash Blossom".to_string()));
        assert_eq!(search_dto.card_type, "Spell");
        assert_eq!(search_dto.attribute, Some("Fire".to_string()));
        assert_eq!(search_dto.race, Some("Quick-Play".to_string()));
        assert_eq!(search_dto.level, Some(1));
        assert_eq!(search_dto.archetype, Some("Archfiend".to_string()));
        assert_eq!(
            search_dto.archetype_source,
            Some("ygorg_effect_en".to_string())
        );
        assert_eq!(search_dto.atk, Some(1000));
        assert_eq!(search_dto.def, Some(1000));
        assert_eq!(search_dto.frame_type, Some("Spell".to_string()));
        assert_eq!(
            search_dto.ygoprodeck_url,
            Some("https://ygoprodeck.com/card/card-name/".to_string())
        );

        let json = serde_json::to_string(&search_dto).unwrap();

        assert!(json.contains("\"name\":\"Floraison de feu\""));
        assert!(json.contains("\"type\":\"Spell\""));
        assert!(json.contains("\"attribute\":\"Fire\""));
        assert!(json.contains("\"race\":\"Quick-Play\""));
        assert!(json.contains("\"level\":1"));
        assert!(json.contains("\"archetype\":\"Archfiend\""));
        assert!(json.contains("\"archetype_source\":\"ygorg_effect_en\""));
        assert!(json.contains("\"atk\":1000"));
        assert!(json.contains("\"def\":1000"));
        assert!(json.contains("\"frame_type\":\"Spell\""));
        assert!(json.contains("\"ygoprodeck_url\":\"https://ygoprodeck.com/card/card-name/\""));
    }
}
