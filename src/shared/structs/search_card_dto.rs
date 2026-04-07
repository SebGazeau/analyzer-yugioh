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
    /// Origine de l’archétype si complété hors YGOProDeck (ex. `ygorg_effect_en`). Absent si import pur API.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archetype_source: Option<String>,
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

#[cfg(test)]
mod tests {
    use super::SearchCardDto;

    fn minimal_dto(archetype_source: Option<String>) -> SearchCardDto {
        SearchCardDto {
            id: 1,
            deck_copy_id: 1,
            name: "Test".to_string(),
            name_en: None,
            card_type: "Monster".to_string(),
            attribute: None,
            race: None,
            level: None,
            archetype: None,
            archetype_source,
            atk: None,
            def: None,
            frame_type: None,
            ygoprodeck_url: None,
            image_url: None,
            ban_tcg: None,
            desc: None,
        }
    }

    #[test]
    fn serde_omits_archetype_source_when_none() {
        let json = serde_json::to_string(&minimal_dto(None)).expect("serialize");
        assert!(
            !json.contains("archetype_source"),
            "clé absente pour parité front (champ optionnel omis) : {json}"
        );
    }

    #[test]
    fn serde_includes_archetype_source_when_some() {
        let json = serde_json::to_string(&minimal_dto(Some("ygorg_effect_en".to_string())))
            .expect("serialize");
        assert!(
            json.contains("\"archetype_source\":\"ygorg_effect_en\""),
            "{json}"
        );
    }
}
