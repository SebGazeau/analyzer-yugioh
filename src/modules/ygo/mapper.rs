//! Mapping API YGOPRODECK → `ygo_engine::CardData` (outil admin set).

use crate::ygo_api::{ApiCard, ApiCardSet, CardPricesResponse, CardmarketVersion};
use ygo_engine::{CardData, Rarity, ReprintRisk, Trend};

fn find_matching_set<'a>(card: &'a ApiCard, set_name: &str) -> Option<&'a ApiCardSet> {
    let sets = card.card_sets.as_deref()?;
    let needle = set_name.trim();
    sets.iter()
        .find(|s| s.set_name.trim().eq_ignore_ascii_case(needle))
}

fn global_cardmarket_price_eur(card: &ApiCard) -> Option<f64> {
    let p = card
        .card_prices
        .as_deref()?
        .first()?
        .cardmarket_price
        .as_deref()?;
    p.trim().parse::<f64>().ok()
}

/// Filtre les cartes candidates (prix global, présence dans le set, rareté ≠ Common sur la ligne du set).
pub fn filter_candidates(cards: Vec<ApiCard>, set_name: &str, min_price_eur: f64) -> Vec<ApiCard> {
    cards
        .into_iter()
        .filter(|c| {
            global_cardmarket_price_eur(c)
                .map(|p| p > min_price_eur)
                .unwrap_or(false)
        })
        .filter(|c| {
            find_matching_set(c, set_name)
                .map(|s| !s.set_rarity.trim().eq_ignore_ascii_case("common"))
                .unwrap_or(false)
        })
        .collect()
}

fn map_version_rarity(raw: &str) -> Rarity {
    let t = raw.trim();
    let lower = t.to_ascii_lowercase();
    if t.eq_ignore_ascii_case("common") {
        Rarity::Common
    } else if t.eq_ignore_ascii_case("rare") {
        Rarity::Rare
    } else if t.eq_ignore_ascii_case("super rare") {
        Rarity::SuperRare
    } else if t.eq_ignore_ascii_case("ultra rare") {
        Rarity::UltraRare
    } else if t.eq_ignore_ascii_case("secret rare")
        || t.eq_ignore_ascii_case("starlight rare")
        || lower.contains("quarter century")
    {
        Rarity::SecretRare
    } else {
        Rarity::Rare
    }
}

fn pull_probability_for_rarity(r: Rarity) -> f64 {
    match r {
        Rarity::Common => 0.50,
        Rarity::Rare => 0.20,
        Rarity::SuperRare => 0.10,
        Rarity::UltraRare => 0.08,
        Rarity::SecretRare => 0.04,
    }
}

fn sell_velocity_default_for_rarity(r: Rarity) -> f64 {
    match r {
        Rarity::SecretRare => 1.0,
        Rarity::UltraRare => 1.5,
        Rarity::SuperRare => 2.0,
        Rarity::Rare | Rarity::Common => 3.0,
    }
}

fn viewsweek(card: &ApiCard) -> u64 {
    card.misc_info
        .as_deref()
        .and_then(|v| v.first())
        .and_then(|m| m.viewsweek)
        .unwrap_or(0)
}

fn sell_velocity_from_viewsweek(viewsweek: u64, mapped: Rarity) -> f64 {
    if viewsweek > 5000 {
        5.0
    } else if viewsweek > 1000 {
        3.0
    } else if viewsweek > 100 {
        1.5
    } else if viewsweek > 0 {
        0.5
    } else {
        sell_velocity_default_for_rarity(mapped)
    }
}

fn parse_set_price_eur(s: &str) -> Option<f64> {
    s.trim().parse::<f64>().ok()
}

/// Construit une ligne `CardData` pour une version Cardmarket.
pub fn build_card_data(api_card: &ApiCard, version: &CardmarketVersion) -> CardData {
    let mapped = map_version_rarity(&version.set_rarity);
    let vw = viewsweek(api_card);
    let market_price = parse_set_price_eur(&version.set_price).unwrap_or(0.0);
    let raw_rarity = version.set_rarity.trim();
    CardData {
        id: api_card.id.to_string(),
        name: api_card.name.clone(),
        rarity: mapped,
        pull_probability: pull_probability_for_rarity(mapped),
        market_price,
        available_copies: 0,
        sell_velocity_per_week: sell_velocity_from_viewsweek(vw, mapped),
        price_trend: Trend::Stable,
        reprint_risk: ReprintRisk::Low,
        cardmarket_url: version.set_url.clone(),
        cardmarket_set_rarity: (!raw_rarity.is_empty()).then(|| raw_rarity.to_string()),
    }
}

/// Toutes les versions d'une carte pour le set demandé (prix > 0).
pub fn build_all_versions(
    api_card: &ApiCard,
    prices: &CardPricesResponse,
    set_name: &str,
) -> Vec<CardData> {
    let Some(versions) = prices.cardmarket.as_deref() else {
        return Vec::new();
    };
    let needle = set_name.trim();
    versions
        .iter()
        .filter(|v| v.set_name.trim().eq_ignore_ascii_case(needle))
        .filter(|v| {
            parse_set_price_eur(&v.set_price)
                .map(|p| p > 0.0)
                .unwrap_or(false)
        })
        .map(|v| build_card_data(api_card, v))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ygo_api::ApiMiscInfo;

    fn card_minimal(
        id: u64,
        name: &str,
        set_name: &str,
        set_rarity: &str,
        cm_price: Option<&str>,
    ) -> ApiCard {
        let j = format!(
            r#"{{"id":{},"name":"{}","type":"Spell Card","card_sets":[{{"set_name":"{}","set_code":"X","set_rarity":"{}"}}],"card_prices":{}}}"#,
            id,
            name,
            set_name,
            set_rarity,
            if let Some(p) = cm_price {
                format!(r#"[{{"cardmarket_price":"{p}"}}]"#)
            } else {
                "[]".to_string()
            }
        );
        serde_json::from_str(&j).expect("api card")
    }

    #[test]
    fn filter_candidates_price_set_and_not_common() {
        let good = card_minimal(1, "A", "LED", "Ultra Rare", Some("5.00"));
        let cheap = card_minimal(2, "B", "LED", "Ultra Rare", Some("1.00"));
        let common = card_minimal(3, "C", "LED", "Common", Some("10.00"));
        let wrong_set = card_minimal(4, "D", "Other", "Ultra Rare", Some("10.00"));
        let out = filter_candidates(vec![good, cheap, common, wrong_set], "LED", 2.0);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].id, 1);
    }

    #[test]
    fn map_rarity_quarter_century_to_secret() {
        let v = CardmarketVersion {
            set_name: "S".into(),
            set_code: "c".into(),
            set_rarity: "Quarter Century Secret Rare".into(),
            set_price: "10".into(),
            set_url: None,
        };
        let api = card_minimal(9, "Z", "S", "x", Some("3"));
        let c = build_card_data(&api, &v);
        assert_eq!(c.rarity, Rarity::SecretRare);
    }

    #[test]
    fn sell_velocity_viewsweek_tiers() {
        let mut api = card_minimal(1, "A", "S", "Rare", Some("3"));
        api.misc_info = Some(vec![ApiMiscInfo {
            views: None,
            viewsweek: Some(6000),
            upvotes: None,
            downvotes: None,
            tcg_date: None,
            formats: None,
        }]);
        let v = CardmarketVersion {
            set_name: "S".into(),
            set_code: "c".into(),
            set_rarity: "Rare".into(),
            set_price: "1".into(),
            set_url: None,
        };
        assert_eq!(build_card_data(&api, &v).sell_velocity_per_week, 5.0);

        api.misc_info = Some(vec![ApiMiscInfo {
            views: None,
            viewsweek: Some(0),
            upvotes: None,
            downvotes: None,
            tcg_date: None,
            formats: None,
        }]);
        let c2 = build_card_data(&api, &v);
        assert!((c2.sell_velocity_per_week - 3.0).abs() < f64::EPSILON);
    }

    #[test]
    fn build_all_versions_filters_set_and_zero_price() {
        let api = card_minimal(1, "Card", "MySet", "Ultra Rare", Some("5"));
        let prices: CardPricesResponse = serde_json::from_str(
            r#"{"cardmarket":[
                {"set_name":"MySet","set_code":"M-","set_rarity":"Ultra Rare","set_price":"0","set_url":null},
                {"set_name":"MySet","set_code":"M-","set_rarity":"Ultra Rare","set_price":"4.5","set_url":"https://cm.example"}
            ]}"#,
        )
        .expect("prices");
        let rows = build_all_versions(&api, &prices, "myset");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].market_price, 4.5);
        assert_eq!(
            rows[0].cardmarket_url.as_deref(),
            Some("https://cm.example")
        );
        assert_eq!(rows[0].cardmarket_set_rarity.as_deref(), Some("Ultra Rare"));
    }

    #[test]
    fn build_card_data_keeps_cardmarket_rarity_label_for_starlight() {
        let v = CardmarketVersion {
            set_name: "S".into(),
            set_code: "c".into(),
            set_rarity: "Starlight Rare".into(),
            set_price: "50".into(),
            set_url: None,
        };
        let api = card_minimal(1, "X", "S", "Ultra Rare", Some("5"));
        let c = build_card_data(&api, &v);
        assert_eq!(c.rarity, Rarity::SecretRare);
        assert_eq!(c.cardmarket_set_rarity.as_deref(), Some("Starlight Rare"));
    }
}
