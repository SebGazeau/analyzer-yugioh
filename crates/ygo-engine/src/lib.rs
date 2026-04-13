//! Moteur pur EV / liquidité / risque pour analyses « display » (aucun HTTP, DB, async).

pub mod engine;
pub mod models;

pub use engine::{analyze, compute_ev, liquidity_score, realizable_price, reprint_discount};
pub use models::{
    AnalysisResult, CardContribution, CardData, DisplayInput, Rarity, ReprintRisk, RiskLevel, Trend,
};
