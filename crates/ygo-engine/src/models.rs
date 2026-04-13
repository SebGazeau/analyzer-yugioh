use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Rarity {
    Common,
    Rare,
    SuperRare,
    UltraRare,
    SecretRare,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Trend {
    Rising,
    Stable,
    Declining,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReprintRisk {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    SpecPlay,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CardData {
    pub id: String,
    pub name: String,
    pub rarity: Rarity,
    pub pull_probability: f64,
    pub market_price: f64,
    pub available_copies: u32,
    pub sell_velocity_per_week: f64,
    pub price_trend: Trend,
    pub reprint_risk: ReprintRisk,
    /// Lien Cardmarket (UI admin) — ignoré par `analyze()`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cardmarket_url: Option<String>,
    /// Rareté telle que sur la ligne Cardmarket (`set_rarity`) — affichage admin ; ignoré par `analyze()`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cardmarket_set_rarity: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DisplayInput {
    pub display_cost: f64,
    pub is_new_set: bool,
    pub cards: Vec<CardData>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CardContribution {
    pub card_id: String,
    pub card_name: String,
    pub realizable_value: f64,
    pub liquidity_score: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub base_ev: f64,
    pub pessimistic_ev: f64,
    pub optimistic_ev: f64,
    pub safe_buy_price: f64,
    pub fair_buy_price: f64,
    pub breakeven_price: f64,
    pub risk_level: RiskLevel,
    pub top_cards: Vec<CardContribution>,
    pub risk_flags: Vec<String>,
}
