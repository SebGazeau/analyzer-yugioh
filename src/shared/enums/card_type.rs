use std::str::FromStr;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum CardType {
    Monster,
    Spell,
    Trap,
    /// Type issu des jeux vidéo (ex. Duel Links), pas une carte physique Monster/Spell/Trap.
    Skill,
    Token,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum CardTypeError {
    #[error("invalid card type: {0}")]
    InvalidCardType(String),
}

impl TryFrom<&str> for CardType {
    type Error = CardTypeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        let n = normalize(value);
        // API YGOProDeck envoie "Spell Card", "Trap Card", "Effect Monster", "Skill Card", etc.
        if n.contains("spell") {
            Ok(CardType::Spell)
        } else if n.contains("trap") {
            Ok(CardType::Trap)
        } else if n.contains("skill") {
            Ok(CardType::Skill)
        } else if n.contains("monster") {
            Ok(CardType::Monster)
        } else if n.contains("token") {
            Ok(CardType::Token)
        } else {
            Err(CardTypeError::InvalidCardType(value.to_string()))
        }
    }
}

fn normalize(s: &str) -> String {
    s.replace(' ', "").to_lowercase()
}
impl FromStr for CardType {
    type Err = CardTypeError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::try_from(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_card_type_try_from() {
        assert_eq!(CardType::try_from("Monster"), Ok(CardType::Monster));
    }

    #[test]
    fn test_card_type_try_from_spell_card() {
        assert_eq!(CardType::try_from("Spell Card"), Ok(CardType::Spell));
        assert_eq!(CardType::try_from("Trap Card"), Ok(CardType::Trap));
        assert_eq!(CardType::try_from("Effect Monster"), Ok(CardType::Monster));
        assert_eq!(CardType::try_from("Skill Card"), Ok(CardType::Skill));
        assert_eq!(CardType::try_from("Token"), Ok(CardType::Token));
    }

    #[test]
    fn test_card_type_try_from_invalid() {
        assert!(matches!(
            CardType::try_from("Invalid Card Type"),
            Err(CardTypeError::InvalidCardType(_))
        ));
    }
}
