use crate::models::{
    AnalysisResult, CardContribution, CardData, DisplayInput, ReprintRisk, RiskLevel, Trend,
};

/// Score de liquidité dans \[0, 1\].
pub fn liquidity_score(card: &CardData) -> f64 {
    let mut score = 1.0_f64;

    let velocity_multiplier = if card.sell_velocity_per_week < 1.0 && card.available_copies > 20 {
        0.30
    } else if card.sell_velocity_per_week < 3.0 && card.available_copies > 10 {
        0.60
    } else {
        1.0
    };
    score *= velocity_multiplier;

    match card.price_trend {
        Trend::Declining => score *= 0.85,
        Trend::Rising => {
            score *= 1.05;
            score = score.min(1.0);
        }
        Trend::Stable => {}
    }

    score.clamp(0.0, 1.0)
}

pub fn reprint_discount(risk: &ReprintRisk) -> f64 {
    match risk {
        ReprintRisk::Low => 1.00,
        ReprintRisk::Medium => 0.85,
        ReprintRisk::High => 0.60,
    }
}

pub fn realizable_price(card: &CardData, scenario_multiplier: f64) -> f64 {
    card.market_price
        * scenario_multiplier
        * liquidity_score(card)
        * reprint_discount(&card.reprint_risk)
}

pub fn compute_ev(input: &DisplayInput, scenario_multiplier: f64) -> f64 {
    input
        .cards
        .iter()
        .map(|c| c.pull_probability * realizable_price(c, scenario_multiplier))
        .sum()
}

fn risk_level_for(input: &DisplayInput, base_ev: f64, pessimistic_ev: f64) -> RiskLevel {
    if base_ev < input.display_cost {
        RiskLevel::SpecPlay
    } else if pessimistic_ev < input.display_cost * 0.70 {
        RiskLevel::High
    } else if pessimistic_ev < input.display_cost * 0.90 {
        RiskLevel::Medium
    } else {
        RiskLevel::Low
    }
}

fn top_card_contributions(input: &DisplayInput, limit: usize) -> Vec<CardContribution> {
    let mut rows: Vec<CardContribution> = input
        .cards
        .iter()
        .map(|c| {
            let liq = liquidity_score(c);
            let rp = realizable_price(c, 1.0);
            CardContribution {
                card_id: c.id.clone(),
                card_name: c.name.clone(),
                realizable_value: c.pull_probability * rp,
                liquidity_score: liq,
            }
        })
        .collect();

    rows.sort_by(|a, b| b.realizable_value.total_cmp(&a.realizable_value));
    rows.truncate(limit);
    rows
}

fn collect_risk_flags(
    input: &DisplayInput,
    base_ev: f64,
    top_cards: &[CardContribution],
) -> Vec<String> {
    let mut flags = Vec::new();

    if let Some(first) = top_cards.first() {
        if base_ev > 0.0 && first.realizable_value > base_ev * 0.40 {
            flags.push(format!("Value concentrated in 1 card: {}", first.card_name));
        }
    }

    for c in &input.cards {
        if c.reprint_risk == ReprintRisk::High {
            flags.push(format!("High reprint risk: {}", c.name));
        }
        let liq = liquidity_score(c);
        if liq < 0.4 && c.market_price > 10.0 {
            flags.push(format!("Illiquid hit: {}", c.name));
        }
    }

    if input.is_new_set {
        flags.push("New set — prices unstable, use pessimistic scenario".to_string());
    }

    flags
}

pub fn analyze(input: DisplayInput) -> AnalysisResult {
    let base_ev = compute_ev(&input, 1.00);
    let pessimistic_ev = compute_ev(&input, 0.75);
    let optimistic_ev = compute_ev(&input, 1.15);

    let safe_buy_price = base_ev * 0.70;
    let fair_buy_price = base_ev * 0.85;
    let breakeven_price = base_ev;

    let risk_level = risk_level_for(&input, base_ev, pessimistic_ev);
    let top_cards = top_card_contributions(&input, 5);
    let risk_flags = collect_risk_flags(&input, base_ev, &top_cards);

    AnalysisResult {
        base_ev,
        pessimistic_ev,
        optimistic_ev,
        safe_buy_price,
        fair_buy_price,
        breakeven_price,
        risk_level,
        top_cards,
        risk_flags,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Rarity;

    #[allow(clippy::too_many_arguments)]
    fn card(
        id: &str,
        name: &str,
        pull: f64,
        price: f64,
        copies: u32,
        velocity: f64,
        trend: Trend,
        reprint: ReprintRisk,
    ) -> CardData {
        CardData {
            id: id.to_string(),
            name: name.to_string(),
            rarity: Rarity::UltraRare,
            pull_probability: pull,
            market_price: price,
            available_copies: copies,
            sell_velocity_per_week: velocity,
            price_trend: trend,
            reprint_risk: reprint,
            cardmarket_url: None,
            cardmarket_set_rarity: None,
        }
    }

    #[test]
    fn test_analyze_when_empty_cards_returns_zero_ev_and_low_risk_if_cost_zero() {
        let input = DisplayInput {
            display_cost: 0.0,
            is_new_set: false,
            cards: vec![],
        };
        let r = analyze(input);
        assert_eq!(r.base_ev, 0.0);
        assert_eq!(r.pessimistic_ev, 0.0);
        assert_eq!(r.optimistic_ev, 0.0);
        assert_eq!(r.risk_level, RiskLevel::Low);
        assert!(r.top_cards.is_empty());
        assert!(r.risk_flags.is_empty());
    }

    #[test]
    fn test_analyze_when_empty_cards_and_new_set_adds_flag() {
        let input = DisplayInput {
            display_cost: 100.0,
            is_new_set: true,
            cards: vec![],
        };
        let r = analyze(input);
        assert!(r.risk_flags.iter().any(|s| s.contains("New set")));
        assert_eq!(r.risk_level, RiskLevel::SpecPlay);
    }

    #[test]
    fn test_analyze_when_single_card_computes_ev() {
        let c = card(
            "1",
            "Hit",
            0.1,
            100.0,
            5,
            5.0,
            Trend::Stable,
            ReprintRisk::Low,
        );
        let input = DisplayInput {
            display_cost: 5.0,
            is_new_set: false,
            cards: vec![c],
        };
        let r = analyze(input);
        assert!((r.base_ev - 10.0).abs() < 1e-9);
        assert_eq!(r.top_cards.len(), 1);
        assert_eq!(r.top_cards[0].card_id, "1");
    }

    #[test]
    fn test_liquidity_score_when_slow_sale_many_copies_applies_stricter_velocity() {
        let strict = card(
            "a",
            "A",
            1.0,
            10.0,
            25,
            0.5,
            Trend::Stable,
            ReprintRisk::Low,
        );
        assert!((liquidity_score(&strict) - 0.30).abs() < 1e-9);
    }

    #[test]
    fn test_liquidity_score_when_moderate_velocity_rule_applies() {
        let c = card(
            "b",
            "B",
            1.0,
            10.0,
            15,
            2.0,
            Trend::Stable,
            ReprintRisk::Low,
        );
        assert!((liquidity_score(&c) - 0.60).abs() < 1e-9);
    }

    #[test]
    fn test_liquidity_score_when_declining_trend_reduces() {
        let c = card(
            "c",
            "C",
            1.0,
            10.0,
            5,
            5.0,
            Trend::Declining,
            ReprintRisk::Low,
        );
        assert!((liquidity_score(&c) - 0.85).abs() < 1e-9);
    }

    #[test]
    fn test_liquidity_score_when_rising_capped_at_one() {
        let c = card("d", "D", 1.0, 10.0, 5, 5.0, Trend::Rising, ReprintRisk::Low);
        assert!((liquidity_score(&c) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_risk_level_when_base_below_cost_is_spec_play() {
        let c = card("e", "E", 1.0, 5.0, 5, 5.0, Trend::Stable, ReprintRisk::Low);
        let input = DisplayInput {
            display_cost: 100.0,
            is_new_set: false,
            cards: vec![c],
        };
        assert_eq!(analyze(input).risk_level, RiskLevel::SpecPlay);
    }

    #[test]
    fn test_risk_level_when_base_ok_but_pessimistic_in_medium_band() {
        // base_ev = 10, pessimistic = 7.5 : pas SpecPlay, pas High (7.5 >= 7),
        // Medium car 7.5 < 9 = 90 % du coût.
        let c = card("g", "G", 1.0, 10.0, 5, 5.0, Trend::Stable, ReprintRisk::Low);
        let display_cost = 10.0;
        let input = DisplayInput {
            display_cost,
            is_new_set: false,
            cards: vec![c],
        };
        let r = analyze(input);
        assert!((r.base_ev - 10.0).abs() < 1e-9);
        assert!((r.pessimistic_ev - 7.5).abs() < 1e-9);
        assert_eq!(r.risk_level, RiskLevel::Medium);
    }

    #[test]
    fn test_risk_level_when_base_clearly_above_cost_is_low() {
        let c = card("f", "F", 1.0, 20.0, 5, 5.0, Trend::Stable, ReprintRisk::Low);
        let display_cost = 10.0;
        let input = DisplayInput {
            display_cost,
            is_new_set: false,
            cards: vec![c],
        };
        let r = analyze(input);
        assert!(r.base_ev >= display_cost);
        assert!(r.pessimistic_ev >= display_cost * 0.90);
        assert_eq!(r.risk_level, RiskLevel::Low);
    }

    #[test]
    fn test_risk_flag_when_concentration_in_one_card() {
        let cheap = card(
            "h1",
            "Bulk",
            0.45,
            2.0,
            100,
            10.0,
            Trend::Stable,
            ReprintRisk::Low,
        );
        let hit = card(
            "h2",
            "Chase",
            0.05,
            200.0,
            5,
            5.0,
            Trend::Stable,
            ReprintRisk::Low,
        );
        let input = DisplayInput {
            display_cost: 1.0,
            is_new_set: false,
            cards: vec![cheap, hit],
        };
        let r = analyze(input);
        assert!(
            r.risk_flags
                .iter()
                .any(|s| s.starts_with("Value concentrated"))
        );
    }

    #[test]
    fn test_risk_flag_when_high_reprint() {
        let c = card(
            "i",
            "I",
            1.0,
            20.0,
            5,
            5.0,
            Trend::Stable,
            ReprintRisk::High,
        );
        let input = DisplayInput {
            display_cost: 0.0,
            is_new_set: false,
            cards: vec![c],
        };
        let r = analyze(input);
        assert!(r.risk_flags.iter().any(|s| s.contains("High reprint risk")));
    }

    #[test]
    fn test_risk_flag_when_illiquid_expensive_hit() {
        let c = card(
            "j",
            "J",
            1.0,
            50.0,
            25,
            0.5,
            Trend::Stable,
            ReprintRisk::Low,
        );
        let input = DisplayInput {
            display_cost: 0.0,
            is_new_set: false,
            cards: vec![c],
        };
        let r = analyze(input);
        assert!(r.risk_flags.iter().any(|s| s.contains("Illiquid hit")));
    }
}
