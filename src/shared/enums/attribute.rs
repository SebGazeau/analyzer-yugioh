use std::str::FromStr;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum Attribute {
    Dark,
    Divine,
    Earth,
    Fire,
    Light,
    Water,
    Wind,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum AttributeWire {
    Dark,
    Divine,
    Earth,
    Fire,
    Light,
    Water,
    Wind,
    Unknown(String),
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum AttributeError {
    #[error("invalid attribute: {0}")]
    InvalidAttribute(String),
}

impl TryFrom<&str> for Attribute {
    type Error = AttributeError;

    fn try_from(s: &str) -> Result<Self, Self::Error> {
        let n = s.trim().to_lowercase();
        match n.as_str() {
            "dark" => Ok(Attribute::Dark),
            "divine" => Ok(Attribute::Divine),
            "earth" => Ok(Attribute::Earth),
            "fire" => Ok(Attribute::Fire),
            "light" => Ok(Attribute::Light),
            "water" => Ok(Attribute::Water),
            "wind" => Ok(Attribute::Wind),
            _ => Err(AttributeError::InvalidAttribute(s.to_string())),
        }
    }
}

impl TryFrom<AttributeWire> for Attribute {
    type Error = AttributeError;

    fn try_from(value: AttributeWire) -> Result<Self, Self::Error> {
        match value {
            AttributeWire::Dark => Ok(Attribute::Dark),
            AttributeWire::Divine => Ok(Attribute::Divine),
            AttributeWire::Earth => Ok(Attribute::Earth),
            AttributeWire::Fire => Ok(Attribute::Fire),
            AttributeWire::Light => Ok(Attribute::Light),
            AttributeWire::Water => Ok(Attribute::Water),
            AttributeWire::Wind => Ok(Attribute::Wind),
            AttributeWire::Unknown(s) => Err(AttributeError::InvalidAttribute(s)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attribute_try_from() {
        assert_eq!(
            Attribute::try_from(AttributeWire::Dark),
            Ok(Attribute::Dark)
        );
    }

    #[test]
    fn test_attribute_try_from_invalid() {
        assert!(matches!(
            Attribute::try_from(
                AttributeWire::Unknown("Invalid Attribute".to_string())
            ), 
            Err(AttributeError::InvalidAttribute(s)) if s == "Invalid Attribute"));
    }
}
