//! Empreinte SHA-256 alignée sur [`static/js/insights/fidraulisTelemetryFingerprint.ts`](../../../../static/js/insights/fidraulisTelemetryFingerprint.ts).

use sha2::{Digest, Sha256};

pub const RULE_VERSION: i16 = 1;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize, PartialEq, Eq, Hash)]
pub struct ZoneRow {
    pub passcode: i64,
    pub qty: i16,
}

fn sort_rows(rows: &[ZoneRow]) -> Vec<ZoneRow> {
    let mut v: Vec<ZoneRow> = rows
        .iter()
        .filter(|r| r.passcode > 0 && r.qty > 0)
        .cloned()
        .collect();
    v.sort_by(|a, b| a.passcode.cmp(&b.passcode).then_with(|| a.qty.cmp(&b.qty)));
    v
}

fn zone_canonical(rows: &[ZoneRow]) -> String {
    sort_rows(rows)
        .iter()
        .map(|r| format!("{}x{}", r.passcode, r.qty))
        .collect::<Vec<_>>()
        .join(",")
}

/// Chaîne canonique avant hash (identique au front).
pub fn canonical_string(
    rule_version: i16,
    has_fidraulis: bool,
    main: &[ZoneRow],
    extra: &[ZoneRow],
    side: &[ZoneRow],
) -> String {
    let fid = if has_fidraulis { "1" } else { "0" };
    format!(
        "v{rule_version}|fid:{fid}|main:{}|extra:{}|side:{}",
        zone_canonical(main),
        zone_canonical(extra),
        zone_canonical(side)
    )
}

pub fn sha256_hex_utf8(text: &str) -> String {
    let mut h = Sha256::new();
    h.update(text.as_bytes());
    hex::encode(h.finalize())
}

pub fn compute_fingerprint(
    has_fidraulis: bool,
    main: &[ZoneRow],
    extra: &[ZoneRow],
    side: &[ZoneRow],
) -> String {
    let raw = canonical_string(RULE_VERSION, has_fidraulis, main, extra, side);
    sha256_hex_utf8(&raw)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_stable_under_permutation() {
        let main_a = vec![
            ZoneRow {
                passcode: 2,
                qty: 1,
            },
            ZoneRow {
                passcode: 1,
                qty: 2,
            },
        ];
        let main_b = vec![
            ZoneRow {
                passcode: 1,
                qty: 2,
            },
            ZoneRow {
                passcode: 2,
                qty: 1,
            },
        ];
        let extra = vec![ZoneRow {
            passcode: 93125329,
            qty: 1,
        }];
        let a = canonical_string(RULE_VERSION, true, &main_a, &extra, &[]);
        let b = canonical_string(RULE_VERSION, true, &main_b, &extra, &[]);
        assert_eq!(a, b);
        assert!(a.contains("fid:1"));
        assert!(a.contains("main:1x2,2x1"));
        assert!(a.contains("extra:93125329x1"));
    }
}
