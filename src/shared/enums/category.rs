use std::str::FromStr;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum Category {
    Starter,
    Extender,
    BoardBreaker,
    Floodgate,
    HandTrap,
    Wincon,
    Time,
    Bick,
    Consistency,
    Interruption,
}

/// Erreur quand une chaîne ne correspond à aucune catégorie connue.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum CategoryError {
    #[error("invalid category: {0}")]
    InvalidCategory(String),
}

impl TryFrom<&str> for Category {
    type Error = CategoryError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        let n = normalize(value);
        match n.as_str() {
            "starter" => Ok(Category::Starter),
            "extender" => Ok(Category::Extender),
            "boardbreaker" => Ok(Category::BoardBreaker),
            "floodgate" => Ok(Category::Floodgate),
            "handtrap" => Ok(Category::HandTrap),
            "wincon" => Ok(Category::Wincon),
            "time" => Ok(Category::Time),
            "bick" | "brick" => Ok(Category::Bick),
            "consistency" => Ok(Category::Consistency),
            "interruption" => Ok(Category::Interruption),
            _ => Err(CategoryError::InvalidCategory(value.to_string())),
        }
    }
}

fn normalize(s: &str) -> String {
    s.replace(' ', "").to_lowercase()
}
impl FromStr for Category {
    type Err = CategoryError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::try_from(s)
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_category_try_from() {
        assert_eq!(Category::try_from("Starter"), Ok(Category::Starter));
        assert_eq!(
            Category::try_from("Board Breaker"),
            Ok(Category::BoardBreaker)
        );
    }

    #[test]
    fn test_category_try_from_invalid() {
        assert!(matches!(
            Category::try_from("Invalid"),
            Err(CategoryError::InvalidCategory(s)) if s == "Invalid"
        ));
    }
}
