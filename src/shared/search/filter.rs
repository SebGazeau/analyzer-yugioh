use crate::shared::structs::card_search_result::CardSearchResult;
use crate::shared::structs::search_query::SearchQuery;

/// Filtre les cartes par la requête : correspondance sur le nom (FR) **ou** le nom anglais (EN),
/// pour une recherche « double » façon Cardmarket (ex. "Blue-Eyes" ou "Yeux Bleus" trouvent la même carte).
pub fn filter_cards(cards: &[CardSearchResult], query: &SearchQuery) -> Vec<CardSearchResult> {
    let q = query.query().to_lowercase();
    cards
        .iter()
        .filter(|card| {
            let matches_name = card.as_str().to_lowercase().contains(&q);
            let matches_name_en = card
                .card_name_en()
                .map(|n| n.as_str().to_lowercase().contains(&q))
                .unwrap_or(false);
            matches_name || matches_name_en
        })
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::enums::{attribute::Attribute, card_type::CardType};
    use crate::shared::structs::card_name::CardName;

    #[test]
    fn test_filter_cards() {
        let card_name = CardName::try_from("Test".to_string()).unwrap();
        let card_type = CardType::try_from("Monster").unwrap();
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
            card_name,
            None,
            card_type,
            attribute,
            race,
            level,
            archetype,
            atk,
            def,
            frame_type,
            ygoprodeck_url,
            None,
        );
        let cards = vec![card_search_result];
        let query = SearchQuery::new("Test");
        let filtered = filter_cards(&cards, &query.unwrap());
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].card_name().as_str(), "Test");
    }

    #[test]
    fn test_filter_cards_matches_name_en() {
        let card_name = CardName::try_from("Cœur des Yeux Bleus".to_string()).unwrap();
        let card_name_en = Some(CardName::try_from("Heart of the Blue-Eyes".to_string()).unwrap());
        let card_type = CardType::try_from("Spell").unwrap();
        let card_search_result = CardSearchResult::new(
            13,
            card_name,
            card_name_en,
            card_type,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        );
        let cards = vec![card_search_result];
        // Recherche sur le nom FR
        let filtered_fr = filter_cards(&cards, &SearchQuery::new("Yeux Bleus").unwrap());
        assert_eq!(filtered_fr.len(), 1);
        // Recherche sur le nom EN (double recherche façon Cardmarket)
        let filtered_en = filter_cards(&cards, &SearchQuery::new("Blue-Eyes").unwrap());
        assert_eq!(filtered_en.len(), 1);
        assert_eq!(filtered_en[0].card_name_en().unwrap().as_str(), "Heart of the Blue-Eyes");
        // assert_eq!(filtered[0].card_type().as_str(), "Monster");
        // assert_eq!(filtered[0].attribute().as_str(), "Dark");
        // assert_eq!(filtered[0].race().as_str(), "Dragon");
        // assert_eq!(filtered[0].level().unwrap(), 1);
        // assert_eq!(filtered[0].archetype().as_str(), "Test");
    }
}
