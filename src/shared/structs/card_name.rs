use std::str::FromStr;

use serde::{Deserialize, Serialize};

#[derive(Hash, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CardName(String);

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum CardNameError {
    #[error("card name cannot be empty")]
    Empty,
}

impl TryFrom<String> for CardName {
    type Error = CardNameError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        (!value.is_empty())
            .then_some(CardName(value))
            .ok_or(CardNameError::Empty)
    }
}

impl FromStr for CardName {
    type Err = CardNameError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::try_from(s.to_string())
    }
}

impl CardName {
    /// Retourne le nom de la carte en `&str` (pour affichage, comparaison, etc.).
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
impl std::fmt::Display for CardName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_card_name_try_from() {
        assert_eq!(
            CardName::try_from("Card Name".to_string()),
            Ok(CardName("Card Name".to_string()))
        );
    }
}
