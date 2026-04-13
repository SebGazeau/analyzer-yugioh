//! Métadonnées produit (display / case) pour dériver les `pull_probability` sans modifier le moteur EV.
//!
//! Convention documentée : `docs/decisions.md` (sections « Métadonnées produit display » et « Case scellée »).

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Normalise un libellé de rareté pour comparaison (insensible à la casse, sans espaces ni ponctuation).
pub fn normalize_rarity_key(s: &str) -> String {
    s.trim()
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RarityCountEntry {
    pub label: String,
    pub count: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RowRarityInput {
    #[serde(default)]
    pub cardmarket_set_rarity: Option<String>,
    /// Valeur enum moteur sérialisée : `Common`, `SecretRare`, etc.
    pub rarity_motor: String,
}

/// Mode de dérivation des pondérations envoyées au moteur (`pull_probability`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeriveMode {
    /// Masse relative par rareté, somme des pondérations = `1 − bulk_mass` (unité « un tirage »).
    #[default]
    SlotMass,
    /// Espérance d’exemplaires par ligne et par **case** : `Q_k / D_k` (voir `docs/decisions.md`).
    CaseExpectedCopies,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DerivePullsRequest {
    #[serde(default)]
    pub derive_mode: DeriveMode,
    pub counts: Vec<RarityCountEntry>,
    pub rows: Vec<RowRarityInput>,
    /// Nombre de cartes **distinctes** dans le set par libellé de rareté (mode `case_expected_copies` uniquement).
    #[serde(default)]
    pub distinct_counts: Vec<RarityCountEntry>,
    /// Fraction \[0, 1\] réservée au « bulk » hors tableau : la somme des probas sur les lignes vaut `1 − bulk_mass`.
    #[serde(default)]
    pub bulk_mass: Option<f64>,
    /// Champs réservés (non utilisés par la dérivation actuelle).
    #[serde(default)]
    pub cards_per_booster: Option<u32>,
    #[serde(default)]
    pub boosters_per_display: Option<u32>,
    #[serde(default)]
    pub displays_per_case: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct DerivePullsResponse {
    pub pull_probabilities: Vec<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warning: Option<String>,
}

fn row_key(row: &RowRarityInput) -> String {
    if let Some(ref cm) = row.cardmarket_set_rarity {
        let t = cm.trim();
        if !t.is_empty() {
            return normalize_rarity_key(t);
        }
    }
    normalize_rarity_key(&row.rarity_motor)
}

fn merge_count_map(entries: &[RarityCountEntry]) -> HashMap<String, u32> {
    let mut map: HashMap<String, u32> = HashMap::new();
    for e in entries {
        let k = normalize_rarity_key(&e.label);
        if k.is_empty() || e.count == 0 {
            continue;
        }
        *map.entry(k).or_insert(0) += e.count;
    }
    map
}

/// Fusion des entrées « distincts » : en cas de doublon de clé, on retient le **max** (évite de sommer par erreur deux lignes pour une même rareté).
fn merge_distinct_map(entries: &[RarityCountEntry]) -> HashMap<String, u32> {
    let mut map: HashMap<String, u32> = HashMap::new();
    for e in entries {
        let k = normalize_rarity_key(&e.label);
        if k.is_empty() || e.count == 0 {
            continue;
        }
        map.entry(k)
            .and_modify(|v| *v = (*v).max(e.count))
            .or_insert(e.count);
    }
    map
}

#[derive(Debug, Error)]
pub enum DerivePullError {
    #[error("aucun comptage utilisable (tous les comptes sont à zéro ou libellés vides)")]
    EmptyCounts,
    #[error("aucune ligne du tableau ne correspond aux libellés de comptage")]
    NoMatchingRows,
    #[error("bulk_mass doit être un nombre fini entre 0 et 1")]
    InvalidBulkMass,
    #[error("mode case_expected_copies : bulk_mass n’est pas pris en charge (utilisez 0 ou omis)")]
    BulkMassUnsupportedInCaseMode,
    #[error(
        "mode case_expected_copies : nombre de cartes distinctes manquant ou nul pour la clé « {0} » (libellé aligné sur les comptages)"
    )]
    MissingDistinctForKey(String),
    #[error(
        "mode case_expected_copies : pour la clé « {key} », {rows} ligne(s) du tableau dépassent le nombre de cartes distinctes ({distinct})"
    )]
    TooManyRowsForDistinct {
        key: String,
        rows: usize,
        distinct: u32,
    },
}

/// À partir des comptages et des clés de rareté par ligne, calcule les `pull_probability` selon `derive_mode`.
pub fn derive_pull_probabilities(
    req: &DerivePullsRequest,
) -> Result<DerivePullsResponse, DerivePullError> {
    match req.derive_mode {
        DeriveMode::SlotMass => derive_slot_mass(req),
        DeriveMode::CaseExpectedCopies => derive_case_expected_copies(req),
    }
}

/// Masse relative par rareté, somme des pondérations = `1 − bulk_mass`.
fn derive_slot_mass(req: &DerivePullsRequest) -> Result<DerivePullsResponse, DerivePullError> {
    let bulk = req.bulk_mass.unwrap_or(0.0);
    if !bulk.is_finite() || !(0.0..=1.0).contains(&bulk) {
        return Err(DerivePullError::InvalidBulkMass);
    }

    let count_map = merge_count_map(&req.counts);
    let s_total: u32 = count_map.values().sum();
    if s_total == 0 {
        return Err(DerivePullError::EmptyCounts);
    }

    let n_rows = req.rows.len();
    let mut pulls = vec![0.0_f64; n_rows];
    let mut unmatched_mass = 0.0_f64;

    for (key, c) in &count_map {
        let mass = f64::from(*c) / f64::from(s_total);
        let matches: Vec<usize> = req
            .rows
            .iter()
            .enumerate()
            .filter(|(_, r)| row_key(r) == *key)
            .map(|(i, _)| i)
            .collect();
        if matches.is_empty() {
            unmatched_mass += mass;
            continue;
        }
        let per = mass / matches.len() as f64;
        for i in matches {
            pulls[i] += per;
        }
    }

    let w: f64 = pulls.iter().sum();
    if w <= 0.0 {
        return Err(DerivePullError::NoMatchingRows);
    }

    let scale = (1.0 - bulk) / w;
    for p in &mut pulls {
        *p *= scale;
    }

    let mut warn_parts = Vec::new();
    if unmatched_mass > 1e-9 {
        warn_parts.push(format!(
            "Part du modèle non assignée (aucune ligne pour certains libellés) : environ {:.1} % de la masse des comptages.",
            unmatched_mass * 100.0
        ));
    }
    if bulk > 1e-9 {
        warn_parts.push(format!(
            "bulk_mass = {:.2} : la somme des probabilités sur les lignes du tableau vaut {:.2} (le reste modélise l’inconnu hors tableau).",
            bulk,
            1.0 - bulk
        ));
    }
    let warning = if warn_parts.is_empty() {
        None
    } else {
        Some(warn_parts.join(" "))
    };

    Ok(DerivePullsResponse {
        pull_probabilities: pulls,
        warning,
    })
}

/// `pull_probability` = espérance du nombre d’exemplaires de la ligne par **case** (`Q_k / D_k` par tirage uniforme sur le pool).
fn derive_case_expected_copies(
    req: &DerivePullsRequest,
) -> Result<DerivePullsResponse, DerivePullError> {
    let bulk = req.bulk_mass.unwrap_or(0.0);
    if bulk > 1e-12 {
        return Err(DerivePullError::BulkMassUnsupportedInCaseMode);
    }
    if !bulk.is_finite() || !(0.0..=1.0).contains(&bulk) {
        return Err(DerivePullError::InvalidBulkMass);
    }

    let q_map = merge_count_map(&req.counts);
    let q_positive: u32 = q_map.values().sum();
    if q_positive == 0 {
        return Err(DerivePullError::EmptyCounts);
    }

    let d_map = merge_distinct_map(&req.distinct_counts);

    for (k, q) in &q_map {
        if *q == 0 {
            continue;
        }
        let d = d_map.get(k).copied().unwrap_or(0);
        if d == 0 {
            return Err(DerivePullError::MissingDistinctForKey(k.clone()));
        }
    }

    let mut rows_per_key: HashMap<String, usize> = HashMap::new();
    for row in &req.rows {
        *rows_per_key.entry(row_key(row)).or_insert(0) += 1;
    }

    for (k, q) in &q_map {
        if *q == 0 {
            continue;
        }
        let d = *d_map.get(k).expect("d>0 vérifié ci-dessus");
        let m = *rows_per_key.get(k).unwrap_or(&0);
        if m > d as usize {
            return Err(DerivePullError::TooManyRowsForDistinct {
                key: k.clone(),
                rows: m,
                distinct: d,
            });
        }
    }

    let n_rows = req.rows.len();
    let mut pulls = vec![0.0_f64; n_rows];
    for (i, row) in req.rows.iter().enumerate() {
        let k = row_key(row);
        let (Some(&q), Some(&d)) = (q_map.get(&k), d_map.get(&k)) else {
            continue;
        };
        if q == 0 || d == 0 {
            continue;
        }
        pulls[i] = f64::from(q) / f64::from(d);
    }

    let w: f64 = pulls.iter().sum();
    if w <= 0.0 {
        return Err(DerivePullError::NoMatchingRows);
    }

    let mut warn_parts = Vec::new();
    let mut unmatched_hits = 0u64;
    for (k, q) in &q_map {
        if *q == 0 {
            continue;
        }
        let m = *rows_per_key.get(k).unwrap_or(&0);
        if m == 0 {
            unmatched_hits += u64::from(*q);
        }
    }
    if unmatched_hits > 0 {
        warn_parts.push(format!(
            "Hits sans ligne correspondante dans le tableau : au total {unmatched_hits} tirage(s) (somme des Q_k pour les clés sans ligne) ne sont pas répartis sur des cartes listées."
        ));
    }

    for (k, q) in &q_map {
        if *q == 0 {
            continue;
        }
        let Some(&d) = d_map.get(k) else {
            continue;
        };
        let m = *rows_per_key.get(k).unwrap_or(&0);
        if m > 0 && (m as u32) < d {
            warn_parts.push(format!(
                "Clé « {} » : {} ligne(s) dans le tableau pour {} carte(s) distincte(s) dans le set — une partie des hits attendus (approx. {:.0} %) peut concerner des cartes absentes du tableau.",
                k,
                m,
                d,
                100.0 * f64::from(d - m as u32) / f64::from(d)
            ));
        }
    }

    let warning = if warn_parts.is_empty() {
        None
    } else {
        Some(warn_parts.join(" "))
    };

    Ok(DerivePullsResponse {
        pull_probabilities: pulls,
        warning,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(cm: Option<&str>, motor: &str) -> RowRarityInput {
        RowRarityInput {
            cardmarket_set_rarity: cm.map(str::to_owned),
            rarity_motor: motor.to_string(),
        }
    }

    fn req_slot(
        counts: Vec<RarityCountEntry>,
        rows: Vec<RowRarityInput>,
        bulk_mass: Option<f64>,
    ) -> DerivePullsRequest {
        DerivePullsRequest {
            derive_mode: DeriveMode::SlotMass,
            counts,
            rows,
            distinct_counts: Vec::new(),
            bulk_mass,
            cards_per_booster: None,
            boosters_per_display: None,
            displays_per_case: None,
        }
    }

    #[test]
    fn derive_splits_evenly_and_normalizes_to_one() {
        let req = req_slot(
            vec![
                RarityCountEntry {
                    label: "Starlight Rare".into(),
                    count: 1,
                },
                RarityCountEntry {
                    label: "Secret Rare".into(),
                    count: 3,
                },
            ],
            vec![
                row(Some("Starlight Rare"), "SecretRare"),
                row(Some("Secret Rare"), "SecretRare"),
                row(Some("Secret Rare"), "SecretRare"),
                row(Some("Secret Rare"), "SecretRare"),
            ],
            None,
        );
        let out = derive_pull_probabilities(&req).expect("ok");
        assert_eq!(out.pull_probabilities.len(), 4);
        let sum: f64 = out.pull_probabilities.iter().sum();
        assert!((sum - 1.0).abs() < 1e-9);
        assert!((out.pull_probabilities[0] - 0.25).abs() < 1e-9);
        let rest = out.pull_probabilities[1];
        assert!((rest - 0.25).abs() < 1e-9);
    }

    #[test]
    fn derive_uses_motor_when_no_cardmarket_label() {
        let req = req_slot(
            vec![RarityCountEntry {
                label: "SecretRare".into(),
                count: 2,
            }],
            vec![row(None, "SecretRare"), row(None, "SecretRare")],
            None,
        );
        let out = derive_pull_probabilities(&req).expect("ok");
        assert!((out.pull_probabilities[0] - 0.5).abs() < 1e-9);
        assert!((out.pull_probabilities[1] - 0.5).abs() < 1e-9);
    }

    #[test]
    fn derive_bulk_mass_scales_sum() {
        let req = req_slot(
            vec![RarityCountEntry {
                label: "Rare".into(),
                count: 1,
            }],
            vec![row(None, "Rare"), row(None, "Rare")],
            Some(0.2),
        );
        let out = derive_pull_probabilities(&req).expect("ok");
        let sum: f64 = out.pull_probabilities.iter().sum();
        assert!((sum - 0.8).abs() < 1e-9);
    }

    #[test]
    fn derive_errors_when_no_match() {
        let req = req_slot(
            vec![RarityCountEntry {
                label: "OnlyThis".into(),
                count: 1,
            }],
            vec![row(None, "Rare")],
            None,
        );
        assert!(matches!(
            derive_pull_probabilities(&req),
            Err(DerivePullError::NoMatchingRows)
        ));
    }

    #[test]
    fn case_mode_expected_copies_per_row() {
        let req = DerivePullsRequest {
            derive_mode: DeriveMode::CaseExpectedCopies,
            counts: vec![RarityCountEntry {
                label: "Secret Rare".into(),
                count: 96,
            }],
            rows: vec![
                row(Some("Secret Rare"), "SecretRare"),
                row(Some("Secret Rare"), "SecretRare"),
            ],
            distinct_counts: vec![RarityCountEntry {
                label: "Secret Rare".into(),
                count: 10,
            }],
            bulk_mass: None,
            cards_per_booster: None,
            boosters_per_display: None,
            displays_per_case: None,
        };
        let out = derive_pull_probabilities(&req).expect("ok");
        assert_eq!(out.pull_probabilities.len(), 2);
        let exp = 96.0 / 10.0;
        assert!((out.pull_probabilities[0] - exp).abs() < 1e-9);
        assert!((out.pull_probabilities[1] - exp).abs() < 1e-9);
        assert!(out.warning.is_some());
    }

    #[test]
    fn case_mode_errors_when_bulk_nonzero() {
        let req = DerivePullsRequest {
            derive_mode: DeriveMode::CaseExpectedCopies,
            counts: vec![RarityCountEntry {
                label: "Rare".into(),
                count: 1,
            }],
            rows: vec![row(None, "Rare")],
            distinct_counts: vec![RarityCountEntry {
                label: "Rare".into(),
                count: 5,
            }],
            bulk_mass: Some(0.1),
            cards_per_booster: None,
            boosters_per_display: None,
            displays_per_case: None,
        };
        assert!(matches!(
            derive_pull_probabilities(&req),
            Err(DerivePullError::BulkMassUnsupportedInCaseMode)
        ));
    }

    #[test]
    fn case_mode_errors_missing_distinct() {
        let req = DerivePullsRequest {
            derive_mode: DeriveMode::CaseExpectedCopies,
            counts: vec![RarityCountEntry {
                label: "Ultra Rare".into(),
                count: 10,
            }],
            rows: vec![row(Some("Ultra Rare"), "UltraRare")],
            distinct_counts: vec![],
            bulk_mass: None,
            cards_per_booster: None,
            boosters_per_display: None,
            displays_per_case: None,
        };
        assert!(matches!(
            derive_pull_probabilities(&req),
            Err(DerivePullError::MissingDistinctForKey(_))
        ));
    }

    #[test]
    fn case_mode_errors_too_many_rows() {
        let req = DerivePullsRequest {
            derive_mode: DeriveMode::CaseExpectedCopies,
            counts: vec![RarityCountEntry {
                label: "Rare".into(),
                count: 4,
            }],
            rows: vec![row(None, "Rare"), row(None, "Rare"), row(None, "Rare")],
            distinct_counts: vec![RarityCountEntry {
                label: "Rare".into(),
                count: 2,
            }],
            bulk_mass: None,
            cards_per_booster: None,
            boosters_per_display: None,
            displays_per_case: None,
        };
        assert!(matches!(
            derive_pull_probabilities(&req),
            Err(DerivePullError::TooManyRowsForDistinct { .. })
        ));
    }

    #[test]
    fn serde_default_mode_is_slot_mass() {
        let json = r#"{"counts":[{"label":"Rare","count":1}],"rows":[{"rarity_motor":"Rare"}]}"#;
        let req: DerivePullsRequest = serde_json::from_str(json).expect("parse");
        assert_eq!(req.derive_mode, DeriveMode::SlotMass);
        assert!(req.distinct_counts.is_empty());
    }
}
