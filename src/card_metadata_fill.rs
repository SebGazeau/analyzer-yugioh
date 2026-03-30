//! Complément d’`archetype` sur `cards` à partir du JSON YGResources (`card_raw`).
//!
//! L’API ne fournit pas de champ « archetype » dédié : on dérive une valeur **heuristique**
//! depuis `cardData.en.effectText` :
//! - monstres : `"Nom" monster` (ligne de matériel, y compris Link) ;
//! - sorts / pièges : motif `add 1 "Nom" card` sur la **première ligne** uniquement si `cardType`
//!   contient `spell` ou `trap` (évite d’accrocher des effets de monstre).
//!   `archetype_source` = [`ARCHETYPE_SOURCE_YGORG_EFFECT_EN`] pour tracer cette origine.

use std::sync::OnceLock;

use regex::Regex;
use serde_json::Value;

/// Valeur stockée dans `cards.archetype_source` pour les compléments issus de l’heuristique EN.
pub const ARCHETYPE_SOURCE_YGORG_EFFECT_EN: &str = "ygorg_effect_en";

const ARCHETYPE_LEN_MAX: usize = 120;
const ARCHETYPE_LEN_MIN: usize = 2;
/// Au-delà de ce nombre de « mots » (séparés par espaces), on ignore la citation
/// `"…" monster` : ressemble trop à un nom de carte complet (ex. pierres White Stone).
const ARCHETYPE_MAX_WORDS: usize = 5;

fn regex_material_start() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r#"(?i)^\s*(?:\d+\s+)?"([^"]{2,120})"\s+monster\b"#).expect("regex")
    })
}

fn regex_quoted_monster() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r#"(?i)"([^"]{2,120})"\s+monster\b"#).expect("regex"))
}

/// `add 1 "Archetype" card` / `Add 1 "X" card` sur la première ligne (Spell/Trap).
fn regex_add_one_quoted_card() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r#"(?i)\badd\s+1\s+"([^"]{2,120})"\s+card\b"#).expect("regex"))
}

fn archetype_candidate_word_count_ok(s: &str) -> bool {
    let n = s.split_whitespace().count();
    n > 0 && n <= ARCHETYPE_MAX_WORDS
}

fn try_derive_archetype_from_effect_line(line: &str) -> Option<String> {
    let t = line.trim();
    if t.is_empty() {
        return None;
    }
    if let Some(caps) = regex_material_start().captures(t) {
        if let Some(m) = caps.get(1) {
            let inner = m.as_str();
            if archetype_candidate_word_count_ok(inner) {
                if let Some(s) = sanitize_archetype_candidate(inner) {
                    return Some(s);
                }
            }
        }
    }
    if let Some(caps) = regex_quoted_monster().captures(t) {
        if let Some(m) = caps.get(1) {
            let inner = m.as_str();
            if archetype_candidate_word_count_ok(inner) {
                return sanitize_archetype_candidate(inner);
            }
        }
    }
    None
}

fn ygorg_en_is_spell_or_trap(payload: &Value) -> bool {
    let Some(ct) = payload
        .pointer("/cardData/en/cardType")
        .and_then(|v| v.as_str())
    else {
        return false;
    };
    let n = ct.to_lowercase();
    n.contains("spell") || n.contains("trap")
}

/// Normalise / valide une chaîne candidate (pas de contrôles, longueur bornée).
pub fn sanitize_archetype_candidate(s: &str) -> Option<String> {
    let t = s.trim();
    if t.len() < ARCHETYPE_LEN_MIN || t.len() > ARCHETYPE_LEN_MAX {
        return None;
    }
    if t.chars().any(|c| c.is_control()) {
        return None;
    }
    Some(t.to_string())
}

/// Extrait un archétype depuis le payload `card_raw` YGOrganization.
///
/// Ordre : champ explicite futur `cardData.en.archetype`, puis motifs monstre sur la 1re ligne,
/// puis pour Spell/Trap uniquement `add 1 "…" card` sur la 1re ligne.
pub fn derive_archetype_from_ygorg_payload(payload: &Value) -> Option<String> {
    if let Some(s) = payload
        .pointer("/cardData/en/archetype")
        .and_then(|v| v.as_str())
    {
        if let Some(t) = sanitize_archetype_candidate(s) {
            return Some(t);
        }
    }
    let effect = payload
        .pointer("/cardData/en/effectText")
        .and_then(|v| v.as_str())?;
    let mut lines = effect.lines();
    let first = lines.next()?.trim();
    if !first.is_empty() {
        if let Some(t) = try_derive_archetype_from_effect_line(first) {
            return Some(t);
        }
        if ygorg_en_is_spell_or_trap(payload) {
            if let Some(caps) = regex_add_one_quoted_card().captures(first) {
                if let Some(m) = caps.get(1) {
                    if let Some(t) = sanitize_archetype_candidate(m.as_str()) {
                        return Some(t);
                    }
                }
            }
        }
    }
    // Support / effets multi-lignes : la 1ʳᵉ ligne est souvent un déclencheur sans matériel cité.
    const MAX_EXTRA_LINES: usize = 15;
    for line in lines.take(MAX_EXTRA_LINES) {
        if let Some(t) = try_derive_archetype_from_effect_line(line) {
            return Some(t);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn gem_knight_seraphinite_first_line() {
        let payload = json!({
            "cardData": { "en": {
                "effectText": "1 \"Gem-Knight\" monster + 1 LIGHT monster\nSecond line."
            }}
        });
        assert_eq!(
            derive_archetype_from_ygorg_payload(&payload).as_deref(),
            Some("Gem-Knight")
        );
    }

    #[test]
    fn explicit_archetype_field_wins() {
        let payload = json!({
            "cardData": { "en": {
                "archetype": "  Test Arc  ",
                "effectText": "ignored"
            }}
        });
        assert_eq!(
            derive_archetype_from_ygorg_payload(&payload).as_deref(),
            Some("Test Arc")
        );
    }

    #[test]
    fn link_monster_later_on_first_line() {
        let payload = json!({
            "cardData": { "en": {
                "effectText": "2+ monsters, including a \"Crusadia\" monster\nMore."
            }}
        });
        assert_eq!(
            derive_archetype_from_ygorg_payload(&payload).as_deref(),
            Some("Crusadia")
        );
    }

    #[test]
    fn no_match_without_quoted_monster() {
        let payload = json!({
            "cardData": { "en": {
                "effectText": "When this card is activated: add 1 card."
            }}
        });
        assert!(derive_archetype_from_ygorg_payload(&payload).is_none());
    }

    #[test]
    fn empty_effect_none() {
        let payload = json!({ "cardData": { "en": { "effectText": "" } } });
        assert!(derive_archetype_from_ygorg_payload(&payload).is_none());
    }

    #[test]
    fn spell_add_one_card_first_line() {
        let payload = json!({
            "cardData": { "en": {
                "cardType": "spell",
                "effectText": "Add 1 \"Branded\" card from your Deck to your hand.\nOther."
            }}
        });
        assert_eq!(
            derive_archetype_from_ygorg_payload(&payload).as_deref(),
            Some("Branded")
        );
    }

    #[test]
    fn spell_add_one_not_on_monster_card() {
        let payload = json!({
            "cardData": { "en": {
                "cardType": "monster",
                "effectText": "You can add 1 \"Dark Magician\" card from your Deck to your hand."
            }}
        });
        assert!(derive_archetype_from_ygorg_payload(&payload).is_none());
    }

    #[test]
    fn quoted_monster_on_second_line_after_trigger() {
        let payload = json!({
            "cardData": { "en": {
                "cardType": "monster",
                "effectText": "When this card is Normal Summoned: You can activate this effect.\nSend 1 \"Blue-Eyes\" monster from your Deck to the GY."
            }}
        });
        assert_eq!(
            derive_archetype_from_ygorg_payload(&payload).as_deref(),
            Some("Blue-Eyes")
        );
    }

    #[test]
    fn skip_very_long_quoted_monster_phrase() {
        let payload = json!({
            "cardData": { "en": {
                "cardType": "monster",
                "effectText": "Line one.\nSend 1 \"The White Stone of Ancient Legends Extra Long Name\" monster."
            }}
        });
        assert!(derive_archetype_from_ygorg_payload(&payload).is_none());
    }
}
