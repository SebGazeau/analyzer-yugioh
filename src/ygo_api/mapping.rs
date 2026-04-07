//! Normalisation des chaînes API YGOProDeck → schéma base.

/// Clé `rarity_code` pour la PK : si l’API renvoie `""`, dériver depuis `set_rarity` pour éviter les collisions.
pub(super) fn stable_rarity_code(api_rarity_code: &str, set_rarity: &str) -> String {
    let t = api_rarity_code.trim();
    if !t.is_empty() {
        return t.to_string();
    }
    let slug: String = set_rarity
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_lowercase();
    if slug.is_empty() {
        "::default".to_string()
    } else {
        format!("::{}", slug.chars().take(48).collect::<String>())
    }
}

/// API envoie "Effect Monster", "Spell Card", etc. → DB : 'Monster', 'Spell', 'Trap'.
pub(super) fn api_type_to_db_type(s: &str) -> String {
    let n = s.to_lowercase();
    if n.contains("spell") {
        "Spell".into()
    } else if n.contains("trap") {
        "Trap".into()
    } else if n.contains("skill") {
        "Spell".into()
    } else {
        // Monstre, jeton ou type inconnu → Monster (aligné historique DB).
        "Monster".into()
    }
}

/// Attribute API (DARK, FIRE, ...) → même format pour DB.
pub(super) fn normalize_attribute(s: &str) -> Option<String> {
    let u = s.trim().to_uppercase();
    if u.is_empty() {
        return None;
    }
    match u.as_str() {
        "DARK" | "DIVINE" | "EARTH" | "FIRE" | "LIGHT" | "WATER" | "WIND" => Some(u),
        _ => None,
    }
}

/// frameType API (normal, effect_pendulum, ...) → valeur ENUM card_frame ou None.
pub(super) fn api_frame_to_db_frame(s: &str) -> Option<&'static str> {
    let n = s.to_lowercase();
    let base = n.strip_suffix("_pendulum").unwrap_or(n.as_str());
    match base {
        "normal" => Some("normal"),
        "effect" => Some("effect"),
        "ritual" => Some("ritual"),
        "fusion" => Some("fusion"),
        "synchro" => Some("synchro"),
        "xyz" => Some("xyz"),
        "link" => Some("link"),
        "token" => Some("token"),
        "spell" => Some("spell"),
        "trap" => Some("trap"),
        "skill" => Some("skill"),
        _ => Some("normal"),
    }
}

pub(super) fn normalize_ban(s: String) -> Option<String> {
    let u = s.trim();
    if u.is_empty() {
        return None;
    }
    match u {
        "Forbidden" | "Limited" | "Semi-Limited" => Some(u.to_string()),
        _ => None,
    }
}
