use std::str::FromStr;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum Engine {
    Engine1,
    Engine2,
    Engine3,
    Staple,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum EngineWire {
    Engine1,
    Engine2,
    Engine3,
    Staple,
    Unknown(String),
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum EngineError {
    #[error("invalid engine: {0}")]
    InvalidEngine(String),
}

impl TryFrom<&str> for Engine {
    type Error = EngineError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        let n = normalize(value);
        match n.as_str() {
            "engine1" => Ok(Engine::Engine1),
            "engine2" => Ok(Engine::Engine2),
            "engine3" => Ok(Engine::Engine3),
            "staple" => Ok(Engine::Staple),
            _ => Err(EngineError::InvalidEngine(value.to_string())),
        }
    }
}

impl FromStr for Engine {
    type Err = EngineError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::try_from(s)
    }
}

fn normalize(s: &str) -> String {
    s.replace(' ', "").to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_try_from() {
        assert_eq!(Engine::try_from("Engine 1"), Ok(Engine::Engine1));
        assert_eq!(Engine::try_from("Engine 2"), Ok(Engine::Engine2));
        assert_eq!(Engine::try_from("Engine 3"), Ok(Engine::Engine3));
        assert_eq!(Engine::try_from("Staple"), Ok(Engine::Staple));
    }

    #[test]
    fn test_engine_try_from_invalid() {
        assert!(matches!(
            Engine::try_from("Invalid Engine"),
            Err(EngineError::InvalidEngine(_))
        ));
    }
}
