use crate::shared::enums::{category::Category, engine::Engine};
use crate::shared::structs::{card_name::CardName, quantity::Quantity};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeckEntry {
    card_name: CardName,
    /// Passcode Yu-Gi-Oh (id API) si connu : fusionne les variantes de nom pour la limite ×3.
    passcode: Option<u64>,
    quantity: Quantity,
    engine: Engine,
    categories: Vec<Category>,
}

impl DeckEntry {
    pub fn new(
        card_name: CardName,
        quantity: Quantity,
        engine: Engine,
        categories: Vec<Category>,
        passcode: Option<u64>,
    ) -> Self {
        Self {
            card_name,
            passcode,
            quantity,
            engine,
            categories,
        }
    }

    pub fn card_name(&self) -> &CardName {
        &self.card_name
    }

    pub fn passcode(&self) -> Option<u64> {
        self.passcode
    }

    pub fn quantity(&self) -> Quantity {
        self.quantity
    }

    pub fn engine(&self) -> Engine {
        self.engine
    }

    pub fn categories(&self) -> &[Category] {
        &self.categories
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deck_entry_new() {
        let card_name = CardName::try_from("Ash Blossom".to_string()).unwrap();
        let quantity = Quantity::try_from(1_u8).unwrap();
        let engine = Engine::try_from("Engine 1").unwrap();
        let categories = vec![Category::try_from("Starter").unwrap()];

        let entry = DeckEntry::new(
            card_name.clone(),
            quantity,
            engine,
            categories.clone(),
            None,
        );

        assert_eq!(entry.card_name, card_name);
        assert_eq!(entry.quantity, quantity);
        assert_eq!(entry.engine, engine);
        assert_eq!(entry.categories, categories);
    }
}
