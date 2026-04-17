//! Re-vérification insight Fidraulis (parité avec le front TS).
//!
//! La **taxonomie « quel effet »** (colonne Contexte Suggestions) est définie côté client
//! (`static/js/insights/fidraulisGyAllowlist.ts`, `fidraulisGyHeuristic.ts`) — ne pas supposer
//! la même granularité ici sans synchroniser les deux côtés.
//!
//! **Synchro Extra** : même règle que `isSynchroMonster` côté TS — `api_type_line` vide ⇒ DTO
//! `type: "Monster"` ; on accepte aussi `frame_type` YGOProDeck `synchro`.

use crate::shared::enums::card_type::CardType;
use crate::shared::structs::card_search_result::CardSearchResult;

use std::collections::HashSet;

use super::fingerprint::{self, ZoneRow};

/// Passcodes allowlist « vérifié » (aligné sur `static/js/insights/fidraulisGyAllowlist.ts`).
const VERIFIED_PASSCODES: &[u64] = &[
    72_444_406, 93_125_329, 53_971_455, 78_397_661, 98_506_199, // Wind Pegasus @Ignister
];

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
    name_has_harmonia_or_harmonie_token(n) && (n.contains("fidraulis") || n.contains("fridaulis"))
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

fn passcode_verified(id: u64, admin_validated: &HashSet<i64>) -> bool {
    VERIFIED_PASSCODES.contains(&id)
        || i64::try_from(id)
            .ok()
            .is_some_and(|p| admin_validated.contains(&p))
}

fn is_synchro_extra_row(c: &CardSearchResult, admin_validated: &HashSet<i64>) -> bool {
    if c.card_type_enum() != CardType::Monster {
        return false;
    }
    let id = c.id();
    if passcode_verified(id, admin_validated) {
        return true;
    }
    // Aligné sur `isSynchroMonster` (TS) : sans `api_type_line`, le DTO recherche expose `type: "Monster"`
    // et `frame_type: "synchro"` (voir `CardSearchResult::to_search_dto`).
    if c.frame_type()
        .is_some_and(|f| f.trim().eq_ignore_ascii_case("synchro"))
    {
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

/// Retire les voyelles accentuées courantes (FR) pour matcher BDD ASCII ou texte typographié.
fn fold_fr_card_desc_chars(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'à' | 'â' => 'a',
            'ù' | 'û' | 'ü' => 'u',
            'ô' | 'ö' => 'o',
            'î' | 'ï' => 'i',
            'ç' => 'c',
            _ => c,
        })
        .collect()
}

fn fr_while_on_field_or_in_gy_phrases(d: &str) -> bool {
    let folded = fold_fr_card_desc_chars(d);
    folded.contains("tant que cette carte est sur le terrain ou dans le cimetiere")
        || folded.contains("tant que cette carte est au terrain ou au cimetiere")
        || folded.contains("tant que cette carte est sur le terrain ou au cimetiere")
        || d.contains("tant que cette carte est sur le terrain ou dans le cimetière")
        || d.contains("tant que cette carte est au terrain ou au cimetière")
        || d.contains("tant que cette carte est sur le terrain ou au cimetière")
}

/// Heuristique alignée sur `cardDescLooksLikeGyWhileOnFieldOrInGy` (TS).
pub fn card_desc_looks_like_gy_while_on_field_or_in_gy(desc: &str) -> bool {
    let d = normalize_desc(desc);
    if d.len() < 28 {
        return false;
    }
    use regex::Regex;
    if let Ok(re) = Regex::new(r"(?i)\bwhile this card is on the field or in the (gy|graveyard)\b")
    {
        if re.is_match(&d) {
            return true;
        }
    }
    if let Ok(re) =
        Regex::new(r"(?i)\bwhile this synchro monster is on the field or in the (gy|graveyard)\b")
    {
        if re.is_match(&d) {
            return true;
        }
    }
    fr_while_on_field_or_in_gy_phrases(&d)
}

/// Heuristique alignée sur `cardDescLooksLikeGyIfInGyActivated` (TS) — effet PSCT « If this card is in your GY: ».
pub fn card_desc_looks_like_gy_if_in_gy_activated(desc: &str) -> bool {
    let d = normalize_desc(desc);
    if d.len() < 22 {
        return false;
    }
    use regex::Regex;
    if let Ok(re) = Regex::new(r"(?i)\bif this card is in your (gy|graveyard)\b") {
        if re.is_match(&d) {
            return true;
        }
    }
    if let Ok(re) = Regex::new(r"(?i)\bif this synchro monster is in your (gy|graveyard)\b") {
        if re.is_match(&d) {
            return true;
        }
    }
    let folded = fold_fr_card_desc_chars(&d);
    if let Ok(re) = Regex::new(r"(?i)\bsi cette carte est dans votre (gy|cimetiere)\b") {
        if re.is_match(&folded) {
            return true;
        }
    }
    if let Ok(re) = Regex::new(r"(?i)\bsi ce monstre synchro est dans votre (gy|cimetiere)\b") {
        if re.is_match(&folded) {
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

/// Résultat d’analyse : fingerprint attendu + listes d’incréments par passcode (synchros « ressource GY » uniquement).
#[derive(Debug, Clone)]
pub struct FidraulisTelemetryAnalysis {
    pub has_fidraulis: bool,
    pub fingerprint: String,
    pub synergy_verified: Vec<i64>,
    pub synergy_heuristic: Vec<i64>,
}

/// Retourne `None` si pas Fidraulis, ou aucun Extra qualifié comme synchro « ressource GY »
/// (aligné sur l’insight `fidraulis_gy_synchro` — pas de persistance pour l’Extra « brut »).
pub fn analyze(
    cards: &[CardSearchResult],
    main: &[ZoneRow],
    extra: &[ZoneRow],
    side: &[ZoneRow],
    admin_validated: &HashSet<i64>,
) -> Option<FidraulisTelemetryAnalysis> {
    let has_fid = deck_has_fidraulis(cards, main, side);
    let fp = fingerprint::compute_fingerprint(has_fid, main, extra, side);
    if !has_fid {
        return None;
    }

    let mut synergy_verified: Vec<i64> = Vec::new();
    let mut synergy_heuristic: Vec<i64> = Vec::new();

    for row in extra {
        if row.qty <= 0 || row.passcode <= 0 {
            continue;
        }
        let Some(c) = find_card(cards, row.passcode) else {
            continue;
        };
        if !is_synchro_extra_row(c, admin_validated) {
            continue;
        }
        let id = c.id();
        let verified = passcode_verified(id, admin_validated);
        let desc = c.card_desc().unwrap_or("").trim();
        let heuristic = !verified
            && !desc.is_empty()
            && (card_desc_looks_like_gy_send_trigger(desc)
                || card_desc_looks_like_gy_while_on_field_or_in_gy(desc)
                || card_desc_looks_like_gy_if_in_gy_activated(desc));
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

    if synergy_verified.is_empty() && synergy_heuristic.is_empty() {
        return None;
    }

    Some(FidraulisTelemetryAnalysis {
        has_fidraulis: has_fid,
        fingerprint: fp,
        synergy_verified,
        synergy_heuristic,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

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
        let a = analyze(&cards, &main, &extra, &[], &HashSet::new()).expect("insight");
        assert!(a.synergy_verified.contains(&93125329));
    }

    #[test]
    fn wind_pegasus_verified_synergy_without_card_desc() {
        let pegasus = mk(
            98_506_199,
            "Wind Pegasus @Ignister",
            "Synchro Monster",
            None,
            None,
        );
        let fid = mk(1, "Fidraulis Harmonia", "Tuner Monster", None, None);
        let cards = vec![pegasus, fid];
        let main = vec![ZoneRow {
            passcode: 1,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 98_506_199,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[], &HashSet::new()).expect("pegasus verified");
        assert!(a.synergy_verified.contains(&98_506_199));
    }

    #[test]
    fn no_fidraulis_returns_none() {
        let c = mk(2, "Dark Magician", "Normal Monster", None, None);
        let cards = vec![c];
        let main = vec![ZoneRow {
            passcode: 2,
            qty: 1,
        }];
        assert!(analyze(&cards, &main, &[], &[], &HashSet::new()).is_none());
    }

    #[test]
    fn fidraulis_with_fusion_extra_only_returns_none() {
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
        assert!(analyze(&cards, &main, &extra, &[], &HashSet::new()).is_none());
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
        let extra_c = mk(9_990_002, "Test Extra FR", "Fusion Monster", None, None);
        let cards = vec![fid_fr, extra_c];
        let main = vec![ZoneRow {
            passcode: 88_888_801,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_002,
            qty: 1,
        }];
        assert!(analyze(&cards, &main, &extra, &[], &HashSet::new()).is_none());
    }

    #[test]
    fn fidraulis_with_heuristic_synchro_extra_synergy() {
        let synchro_gy = mk(
            9_990_003,
            "Test Synchro GY",
            "Synchro Tuner Monster",
            Some("If this card is sent to the GY: draw 1."),
            None,
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![synchro_gy, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_003,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[], &HashSet::new()).expect("heuristic synchro");
        assert!(a.synergy_verified.is_empty());
        assert!(a.synergy_heuristic.contains(&9_990_003));
    }

    #[test]
    fn fidraulis_extra_passcode_admin_validated_counts_as_synergy_verified() {
        let synchro_gy = mk(
            9_990_033,
            "Test Synchro Admin Verified",
            "Synchro Tuner Monster",
            Some("If this card is sent to the GY: draw 1."),
            None,
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![synchro_gy, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_033,
            qty: 1,
        }];
        let mut admin = HashSet::new();
        admin.insert(9_990_033);
        let a = analyze(&cards, &main, &extra, &[], &admin).expect("admin verified");
        assert!(a.synergy_verified.contains(&9_990_033));
        assert!(!a.synergy_heuristic.contains(&9_990_033));
    }

    #[test]
    fn fidraulis_with_heuristic_synchro_while_on_field_or_gy_only() {
        let synchro = mk(
            9_990_004,
            "Test Synchro While Field Gy",
            "Synchro Monster",
            Some(
                "While this card is on the field or in the GY: You can target 1 Spell/Trap; destroy it.",
            ),
            None,
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![synchro, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_004,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[], &HashSet::new()).expect("while field or gy");
        assert!(a.synergy_verified.is_empty());
        assert!(a.synergy_heuristic.contains(&9_990_004));
    }

    #[test]
    fn card_desc_if_in_gy_matches_psy_framelord_omega_clause() {
        let desc = "If this card is in your GY: You can target 1 other card in the GY; shuffle both it and this card into the Deck.";
        assert!(card_desc_looks_like_gy_if_in_gy_activated(desc));
        assert!(!card_desc_looks_like_gy_send_trigger(desc));
    }

    #[test]
    fn fidraulis_with_heuristic_synchro_if_in_gy_only() {
        let omega_like = mk(
            9_990_006,
            "Test Synchro If In GY",
            "Synchro Monster",
            Some(
                "If this card is in your GY: You can target 1 other card in the GY; shuffle both it and this card into the Deck.",
            ),
            None,
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![omega_like, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_006,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[], &HashSet::new()).expect("if in gy heuristic");
        assert!(a.synergy_verified.is_empty());
        assert!(a.synergy_heuristic.contains(&9_990_006));
    }

    #[test]
    fn fidraulis_heuristic_extra_synchro_via_frame_type_when_api_type_line_is_empty_monster() {
        let zeta_like = CardSearchResult::new(
            9_990_007,
            CardName::try_from("PSY-Framelord Zeta".to_string()).unwrap(),
            None,
            CardType::Monster,
            Some(Attribute::Dark),
            None,
            None,
            None,
            None,
            None,
            None,
            Some("synchro".to_string()),
            None,
            None,
            None,
            Some(
                "If this card is in your Graveyard: You can target 1 other card in your Graveyard; return this card to the Extra Deck."
                    .to_string(),
            ),
            Some(String::new()),
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![zeta_like, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_007,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[], &HashSet::new())
            .expect("frame_type synchro heuristic");
        assert!(a.synergy_verified.is_empty());
        assert!(a.synergy_heuristic.contains(&9_990_007));
    }

    #[test]
    fn fidraulis_extra_xyz_frame_not_counted_as_synchro_synergy() {
        let xyz_like = CardSearchResult::new(
            9_990_008,
            CardName::try_from("Test Xyz Only".to_string()).unwrap(),
            None,
            CardType::Monster,
            Some(Attribute::Dark),
            None,
            None,
            None,
            None,
            None,
            None,
            Some("xyz".to_string()),
            None,
            None,
            None,
            Some("If this card is sent to the GY: draw 1.".to_string()),
            Some(String::new()),
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![xyz_like, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_008,
            qty: 1,
        }];
        assert!(analyze(&cards, &main, &extra, &[], &HashSet::new()).is_none());
    }

    #[test]
    fn fidraulis_with_heuristic_synchro_fr_while_field_gy_ascii_cimetiere() {
        let synchro = mk(
            9_990_005,
            "Test Synchro FR ASCII",
            "Synchro Monster",
            Some(
                "Si une autre carte est detruite tant que cette carte est sur le terrain ou dans le cimetiere : piochez 1.",
            ),
            None,
        );
        let fid = mk(
            FIDRAULIS_HARMONIA_PASSCODE,
            "Fidraulis, the Dragon of Harmonia",
            "Tuner Monster",
            None,
            None,
        );
        let cards = vec![synchro, fid];
        let main = vec![ZoneRow {
            passcode: FIDRAULIS_HARMONIA_PASSCODE as i64,
            qty: 1,
        }];
        let extra = vec![ZoneRow {
            passcode: 9_990_005,
            qty: 1,
        }];
        let a = analyze(&cards, &main, &extra, &[], &HashSet::new()).expect("fr ascii cimetiere");
        assert!(a.synergy_verified.is_empty());
        assert!(a.synergy_heuristic.contains(&9_990_005));
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
        assert!(analyze(&cards, &main, &[], &[], &HashSet::new()).is_none());
    }
}
