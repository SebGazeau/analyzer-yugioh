//! Re-vérification insight Fidraulis (parité avec le front TS).

use crate::shared::enums::card_type::CardType;
use crate::shared::structs::card_search_result::CardSearchResult;

use super::fingerprint::{self, ZoneRow};

/// Passcodes allowlist « vérifié » (aligné sur `static/js/insights/fidraulisGyAllowlist.ts`).
const VERIFIED_PASSCODES: &[u64] = &[72_444_406, 93_125_329, 53_971_455, 78_397_661];

/// Passcode « Fidraulis, the Dragon of Harmonia » (nom affiché souvent long / localisé).
const FIDRAULIS_HARMONIA_PASSCODE: u64 = 70_088_809;

fn normalize_name(s: &str) -> String {
    s.trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn name_has_harmonia_or_harmonie_token(n: &str) -> bool {
    n.contains("harmonia") || n.contains("harmonie")
}

fn name_tokens_indicate_fidraulis_harmonia(n: &str) -> bool {
    name_has_harmonia_or_harmonie_token(n)
        && (n.contains("fidraulis") || n.contains("fridaulis"))
}

fn is_fidraulis_harmonia_card(c: &CardSearchResult) -> bool {
    if c.card_type_enum() != CardType::Monster {
        return false;
    }
    if c.id() == FIDRAULIS_HARMONIA_PASSCODE {
        return true;
    }
    let n = normalize_name(c.as_str());
    let n_en = c.card_name_en().map(|e| normalize_name(e.as_str()));
    n == "fidraulis harmonia"
        || n == "fridaulis harmonia"
        || n == "fidraulis harmonie"
        || n == "fridaulis harmonie"
        || name_tokens_indicate_fidraulis_harmonia(&n)
        || n_en.as_ref().is_some_and(|x| {
            x == "fidraulis harmonia"
                || x == "fridaulis harmonia"
                || x == "fidraulis harmonie"
                || x == "fridaulis harmonie"
                || name_tokens_indicate_fidraulis_harmonia(x)
        })
}

fn find_card(cards: &[CardSearchResult], passcode: i64) -> Option<&CardSearchResult> {
    let id = u64::try_from(passcode).ok()?;
    cards.iter().find(|c| c.id() == id)
}

fn passcode_verified(id: u64) -> bool {
    VERIFIED_PASSCODES.contains(&id)
}

fn is_synchro_extra_row(c: &CardSearchResult) -> bool {
    if c.card_type_enum() != CardType::Monster {
        return false;
    }
    let id = c.id();
    if passcode_verified(id) {
        return true;
    }
    let t = c.api_type_line().to_lowercase();
    if !t.contains("synchro") {
        return false;
    }
    !(t.contains("xyz") || t.contains("fusion") || t.contains("link"))
}

fn normalize_desc(s: &str) -> String {
    s.trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Heuristique alignée sur `cardDescLooksLikeGySendTrigger` (TS).
pub fn card_desc_looks_like_gy_send_trigger(desc: &str) -> bool {
    let d = normalize_desc(desc);
    if d.len() < 12 {
        return false;
    }
    use regex::Regex;
    let re1 = Regex::new(r"(?i)\bif this card is sent\b").ok();
    let re_gy = Regex::new(r"(?i)\b(gy|graveyard)\b").ok();
    if let (Some(a), Some(b)) = (re1, re_gy.as_ref()) {
        if a.is_match(&d) && b.is_match(&d) {
            return true;
        }
    }
    let re2 = Regex::new(r"(?i)\bif this synchro monster is sent\b").ok();
    if let (Some(a), Some(b)) = (re2, re_gy.as_ref()) {
        if a.is_match(&d) && b.is_match(&d) {
            return true;
        }
    }
    let re3 = Regex::new(r"(?i)\bwhen this card is sent\b").ok();
    if let (Some(a), Some(b)) = (re3, re_gy.as_ref()) {
        if a.is_match(&d) && b.is_match(&d) {
            return true;
        }
    }
    let re4 = Regex::new(r"(?i)\bsent to the (gy|graveyard)\b").ok();
    let re_ifwhen = Regex::new(r"(?i)(\bif\b|\bwhen\b)").ok();
    if let (Some(a), Some(b), Some(c)) = (re4, re_ifwhen, re_gy.as_ref()) {
        if a.is_match(&d) && b.is_match(&d) && c.is_match(&d) {
            return true;
        }
    }
    let re5 = Regex::new(r"(?i)\bbanished instead of being sent\b").ok();
    if let (Some(a), Some(b)) = (re5, re_gy.as_ref()) {
        if a.is_match(&d) && b.is_match(&d) {
            return true;
        }
    }
    let re_fr1 = Regex::new(r"(?i)envoyée? au cimetière").ok();
    let re_fr2 = Regex::new(r"(?i)(\bsi\b|\bquand\b|cette carte)").ok();
    if let (Some(a), Some(b)) = (re_fr1, re_fr2) {
        if a.is_match(&d) && b.is_match(&d) {
            return true;
        }
    }
    let re_fr3 = Regex::new(r"(?i)envoyée? au cimetière").ok();
    let re_fr4 = Regex::new(r"(?i)monstre synchro").ok();
    if let (Some(a), Some(b)) = (re_fr3, re_fr4) {
        if a.is_match(&d) && b.is_match(&d) {
            return true;
        }
    }
    false
}

fn deck_has_fidraulis(cards: &[CardSearchResult], main: &[ZoneRow], side: &[ZoneRow]) -> bool {
    let check_zone = |rows: &[ZoneRow]| {
        rows.iter().any(|r| {
            r.qty > 0 && find_card(cards, r.passcode).is_some_and(is_fidraulis_harmonia_card)
        })
    };
    check_zone(main) || check_zone(side)
}

/// Résultat d’analyse : fingerprint attendu + listes d’incréments par passcode.
#[derive(Debug, Clone)]
pub struct FidraulisTelemetryAnalysis {
    pub has_fidraulis: bool,
    pub fingerprint: String,
    /// Passcodes distincts Extra (qty > 0) pour co-occurrence +1 chacun par sauvegarde.
    pub cooccurrence_passcodes: Vec<i64>,
    pub synergy_verified: Vec<i64>,
    pub synergy_heuristic: Vec<i64>,
}

/// Retourne `None` si pas Fidraulis, ou Extra vide / sans passcodes valides (aucune donnée à agréger).
/// Dès qu’il y a au moins une carte Extra avec passcode > 0, on enregistre les cooccurrences même
/// sans Synchro « ressource GY » (synergie vide).
pub fn analyze(
    cards: &[CardSearchResult],
    main: &[ZoneRow],
    extra: &[ZoneRow],
    side: &[ZoneRow],
) -> Option<FidraulisTelemetryAnalysis> {
    let has_fid = deck_has_fidraulis(cards, main, side);
    let fp = fingerprint::compute_fingerprint(has_fid, main, extra, side);
    if !has_fid {
        return None;
    }

    let mut cooccurrence: Vec<i64> = extra
        .iter()
        .filter(|r| r.passcode > 0 && r.qty > 0)
        .map(|r| r.passcode)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    cooccurrence.sort_unstable();

    let mut synergy_verified: Vec<i64> = Vec::new();
    let mut synergy_heuristic: Vec<i64> = Vec::new();

    for row in extra {
        if row.qty <= 0 || row.passcode <= 0 {
            continue;
        }
        let Some(c) = find_card(cards, row.passcode) else {
            continue;
        };
        if !is_synchro_extra_row(c) {
            continue;
        }
        let id = c.id();
        let verified = passcode_verified(id);
        let desc = c.card_desc().unwrap_or("").trim();
        let heuristic = !verified && !desc.is_empty() && card_desc_looks_like_gy_send_trigger(desc);
        if !verified && !heuristic {
            continue;
        }
        if verified {
            synergy_verified.push(row.passcode);
        } else {
            synergy_heuristic.push(row.passcode);
        }
    }

    synergy_verified.sort_unstable();
    synergy_verified.dedup();
    synergy_heuristic.sort_unstable();
    synergy_heuristic.dedup();

    if cooccurrence.is_empty() && synergy_verified.is_empty() && synergy_heuristic.is_empty() {
        return None;
    }

    Some(FidraulisTelemetryAnalysis {
        has_fidraulis: has_fid,
        fingerprint: fp,
        cooccurrence_passcodes: cooccurrence,
        synergy_verified,
        synergy_heuristic,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::enums::attribute::Attribute;
    use crate::shared::structs::card_name::CardName;

    fn mk(
        id: u64,
        name: &str,
        type_line: &str,
        desc: Option<&str>,
        name_en: Option<&str>,
    ) -> CardSearchResult {
        CardSearchResult::new(
            id,
            CardName::try_from(name.to_string()).unwrap(),
            name_en.map(|s| CardName::try_from(s.to_string()).unwrap()),
            CardType::try_from(type_line).unwrap(),
            Some(Attribute::Dark),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            desc.map(String::from),
            Some(type_line.to_string()),
        )
    }

    #[test]
    fn malong_monster_type_verified_synergy() {
        let malong = mk(
            93125329,
            "Golden Cloud Beast - Malong",
            "Monster",
            None,
            None,
        );
        let fid = mk(1, "Fidraulis Harmonia", "Tuner Monster", None, None);
        let cards = vec![malong, fid];
        let main = vec![ZoneRow {
            passcode: 1,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 93125329,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[]).expect("insight");
        assert!(a.synergy_verified.contains(&93125329));
    }

    #[test]
    fn no_fidraulis_returns_none() {
        let c = mk(2, "Dark Magician", "Normal Monster", None, None);
        let cards = vec![c];
        let main = vec![ZoneRow {
            passcode: 2,
            qty: 1,
        }];
        assert!(analyze(&cards, &main, &[], &[]).is_none());
    }

    #[test]
    fn fidraulis_with_fusion_extra_cooccurrence_only() {
        let fusion_only = mk(
            9_990_001,
            "Test Fusion Only",
            "Fusion Monster",
            Some("No GY clause."),
            None,
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![fusion_only, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_001,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[]).expect("cooccurrence without synergy");
        assert!(a.synergy_verified.is_empty());
        assert!(a.synergy_heuristic.is_empty());
        assert!(a.cooccurrence_passcodes.contains(&9_990_001));
    }

    #[test]
    fn french_harmonie_title_identifies_fidraulis_without_canonical_passcode() {
        let fid_fr = mk(
            88_888_801,
            "Fidraulis, le Dragon de l'Harmonie",
            "Tuner Monster",
            None,
            None,
        );
        let extra_c = mk(
            9_990_002,
            "Test Extra FR",
            "Fusion Monster",
            None,
            None,
        );
        let cards = vec![fid_fr, extra_c];
        let main = vec![ZoneRow {
            passcode: 88_888_801,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_002,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[]).expect("FR harmonie title");
        assert!(a.has_fidraulis);
        assert!(a.cooccurrence_passcodes.contains(&9_990_002));
    }

    #[test]
    fn fidraulis_only_no_extra_returns_none() {
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        assert!(analyze(&cards, &main, &[], &[]).is_none());
    }
}
