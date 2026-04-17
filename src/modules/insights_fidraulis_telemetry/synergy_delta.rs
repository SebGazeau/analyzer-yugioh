//! Delta entre deux snapshots synergy (vérifié / heuristique) pour télémétrie Fidraulis.

use std::collections::HashSet;

/// Opérations sur `insight_fidraulis_passcode_stats` dérivées du dernier sync deck.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct SynergyTelemetryDelta {
    pub inc_verified: Vec<i64>,
    pub dec_verified: Vec<i64>,
    pub inc_heuristic: Vec<i64>,
    pub dec_heuristic: Vec<i64>,
}

fn sort_dedup(v: &mut Vec<i64>) {
    v.sort_unstable();
    v.dedup();
}

/// `prev_*` et `current_*` supposés déjà triés et dédupliqués (comme sortie de `rule::analyze`).
pub fn compute_synergy_telemetry_delta(
    prev_verified: &[i64],
    prev_heuristic: &[i64],
    current_verified: &[i64],
    current_heuristic: &[i64],
) -> SynergyTelemetryDelta {
    let pv: HashSet<i64> = prev_verified.iter().copied().collect();
    let ph: HashSet<i64> = prev_heuristic.iter().copied().collect();

    let mut inc_verified = Vec::new();
    let mut dec_verified = Vec::new();
    let mut inc_heuristic = Vec::new();
    let mut dec_heuristic = Vec::new();

    for &p in current_verified {
        if !pv.contains(&p) {
            inc_verified.push(p);
            if ph.contains(&p) {
                dec_heuristic.push(p);
            }
        }
    }
    for &p in current_heuristic {
        if !ph.contains(&p) {
            inc_heuristic.push(p);
            if pv.contains(&p) {
                dec_verified.push(p);
            }
        }
    }

    sort_dedup(&mut inc_verified);
    sort_dedup(&mut dec_verified);
    sort_dedup(&mut inc_heuristic);
    sort_dedup(&mut dec_heuristic);

    SynergyTelemetryDelta {
        inc_verified,
        dec_verified,
        inc_heuristic,
        dec_heuristic,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_prev_counts_all_current_verified() {
        let d = compute_synergy_telemetry_delta(&[], &[], &[10, 20], &[]);
        assert_eq!(d.inc_verified, vec![10, 20]);
        assert!(d.inc_heuristic.is_empty());
        assert!(d.dec_verified.is_empty());
        assert!(d.dec_heuristic.is_empty());
    }

    #[test]
    fn add_one_verified() {
        let d = compute_synergy_telemetry_delta(&[1], &[], &[1, 2], &[]);
        assert_eq!(d.inc_verified, vec![2]);
    }

    #[test]
    fn upgrade_heuristic_to_verified() {
        let d = compute_synergy_telemetry_delta(&[], &[99], &[99], &[]);
        assert_eq!(d.inc_verified, vec![99]);
        assert_eq!(d.dec_heuristic, vec![99]);
    }

    #[test]
    fn downgrade_verified_to_heuristic() {
        let d = compute_synergy_telemetry_delta(&[7], &[], &[], &[7]);
        assert_eq!(d.inc_heuristic, vec![7]);
        assert_eq!(d.dec_verified, vec![7]);
    }

    #[test]
    fn stable_no_ops() {
        let d = compute_synergy_telemetry_delta(&[1, 2], &[3], &[1, 2], &[3]);
        assert_eq!(d, SynergyTelemetryDelta::default());
    }

    #[test]
    fn new_heuristic_only() {
        let d = compute_synergy_telemetry_delta(&[], &[1], &[1], &[2]);
        assert_eq!(d.inc_heuristic, vec![2]);
    }
}
