//! DTO et mapping pour l'API YGOProDeck (cardinfo.php).
//! Utilisé par fetch_cards pour parser la réponse et produire les lignes à upsert en base.

use serde::Deserialize;

/// Réponse complète de l'API : `{"data": [...]}`.
#[derive(Debug, Deserialize)]
pub struct CardsApiResponse {
    pub data: Vec<ApiCard>,
}

/// Une carte telle que renvoyée par l'API (champs utilisés pour la table `cards`).
#[derive(Debug, Deserialize)]
pub struct ApiCard {
    pub id: u64,
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(rename = "frameType")]
    pub frame_type: Option<String>,
    pub desc: Option<String>,
    pub atk: Option<i32>,
    pub def: Option<i32>,
    pub level: Option<u8>,
    pub race: Option<String>,
    pub attribute: Option<String>,
    pub archetype: Option<String>,
    #[serde(rename = "ygoprodeck_url")]
    pub ygoprodeck_url: Option<String>,
    #[serde(rename = "card_images")]
    pub card_images: Option<Vec<ApiCardImage>>,
    #[serde(rename = "banlist_info")]
    pub banlist_info: Option<ApiBanlistInfo>,
    /// Impressions / sets (optionnel selon la requête API).
    #[serde(default)]
    pub card_sets: Option<Vec<ApiCardSet>>,
}

/// Une entrée `card_sets[]` dans la réponse `cardinfo.php` v7.
#[derive(Debug, Deserialize, Clone)]
pub struct ApiCardSet {
    pub set_name: String,
    pub set_code: String,
    pub set_rarity: String,
    #[serde(default)]
    pub set_rarity_code: String,
    #[serde(default)]
    pub set_price: String,
}

#[derive(Debug, Deserialize)]
pub struct ApiCardImage {
    #[serde(rename = "image_url")]
    pub image_url: Option<String>,
    #[serde(rename = "image_url_small")]
    pub image_url_small: Option<String>,
    #[serde(rename = "image_url_cropped")]
    pub image_url_cropped: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApiBanlistInfo {
    #[serde(rename = "ban_tcg")]
    pub ban_tcg: Option<String>,
    #[serde(rename = "ban_ocg")]
    pub ban_ocg: Option<String>,
}

/// Ligne prête pour upsert dans la table `cards` (valeurs brutes pour SQL).
#[derive(Debug, Clone)]
pub struct CardUpsertRow {
    pub id: i64,
    pub name: String,
    pub name_en: Option<String>,
    pub type_: String, // 'Monster' | 'Spell' | 'Trap'
    pub attribute: Option<String>,
    pub frame_type: Option<String>,
    pub race: Option<String>,
    pub level: Option<i16>,
    pub archetype: Option<String>,
    pub atk: Option<i32>,
    pub def: Option<i32>,
    pub ygoprodeck_url: Option<String>,
    pub card_desc: String,
    pub image_url: Option<String>,
    pub image_url_small: Option<String>,
    pub image_url_cropped: Option<String>,
    pub ban_tcg: Option<String>,
    pub ban_ocg: Option<String>,
}

/// Ligne pour `INSERT` / upsert dans `card_sets` (hors prix : `set_price` toujours `None` pour l’instant).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CardSetUpsertRow {
    pub card_id: i64,
    pub set_code: String,
    pub rarity_code: String,
    pub set_name: String,
    pub rarity: String,
    pub set_price: Option<String>,
}

/// Clé `rarity_code` pour la PK : si l’API renvoie `""`, dériver depuis `set_rarity` pour éviter les collisions.
fn stable_rarity_code(api_rarity_code: &str, set_rarity: &str) -> String {
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

impl ApiCard {
    /// Lignes `card_sets` pour cette carte (vide si pas de bloc ou tableau vide).
    pub fn card_set_rows(&self) -> Vec<CardSetUpsertRow> {
        let Some(sets) = self.card_sets.as_ref() else {
            return Vec::new();
        };
        let id = self.id as i64;
        sets.iter()
            .map(|s| CardSetUpsertRow {
                card_id: id,
                set_code: s.set_code.trim().to_string(),
                rarity_code: stable_rarity_code(&s.set_rarity_code, &s.set_rarity),
                set_name: s.set_name.trim().to_string(),
                rarity: s.set_rarity.trim().to_string(),
                set_price: None,
            })
            .filter(|r| !r.set_code.is_empty())
            .collect()
    }

    /// Convertit une carte API en ligne pour upsert. Gère les ENUMs (type, attribute, frame_type, ban).
    pub fn to_upsert_row(&self) -> CardUpsertRow {
        let (image_url, image_url_small, image_url_cropped) = self
            .card_images
            .as_deref()
            .and_then(|a| a.first())
            .map(|img| {
                (
                    img.image_url.clone(),
                    img.image_url_small.clone(),
                    img.image_url_cropped.clone(),
                )
            })
            .unwrap_or((None, None, None));

        CardUpsertRow {
            id: self.id as i64,
            name: self.name.clone(),
            name_en: None,
            type_: api_type_to_db_type(&self.type_),
            attribute: self
                .attribute
                .as_deref()
                .map(normalize_attribute)
                .flatten()
                .map(String::from),
            frame_type: self
                .frame_type
                .as_deref()
                .and_then(api_frame_to_db_frame)
                .map(String::from),
            race: self.race.clone(),
            level: self.level.map(|l| l as i16),
            archetype: self.archetype.clone(),
            atk: self.atk,
            def: self.def,
            ygoprodeck_url: self.ygoprodeck_url.clone(),
            card_desc: self.desc.clone().unwrap_or_default(),
            image_url,
            image_url_small,
            image_url_cropped,
            ban_tcg: self
                .banlist_info
                .as_ref()
                .and_then(|b| b.ban_tcg.clone())
                .and_then(normalize_ban),
            ban_ocg: self
                .banlist_info
                .as_ref()
                .and_then(|b| b.ban_ocg.clone())
                .and_then(normalize_ban),
        }
    }
}

/// API envoie "Effect Monster", "Spell Card", etc. → DB : 'Monster', 'Spell', 'Trap'.
fn api_type_to_db_type(s: &str) -> String {
    let n = s.to_lowercase();
    if n.contains("spell") {
        "Spell".into()
    } else if n.contains("trap") {
        "Trap".into()
    } else if n.contains("skill") {
        "Spell".into()
    } else if n.contains("monster") || n.contains("token") {
        "Monster".into()
    } else {
        "Monster".into()
    }
}

/// Attribute API (DARK, FIRE, ...) → même format pour DB.
fn normalize_attribute(s: &str) -> Option<String> {
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
fn api_frame_to_db_frame(s: &str) -> Option<&'static str> {
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

fn normalize_ban(s: String) -> Option<String> {
    let u = s.trim();
    if u.is_empty() {
        return None;
    }
    match u {
        "Forbidden" | "Limited" | "Semi-Limited" => Some(u.to_string()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_card_sets_and_builds_rows() {
        let j = r#"{"id":1,"name":"X","type":"Normal Monster","card_sets":[
            {"set_name":"LOB","set_code":"LOB-001","set_rarity":"UR","set_rarity_code":"(UR)","set_price":"1"},
            {"set_name":"Tin","set_code":"MP24-EN001","set_rarity":"Quarter Century Secret Rare","set_rarity_code":"","set_price":"0"}
        ]}"#;
        let c: ApiCard = serde_json::from_str(j).expect("parse");
        let rows = c.card_set_rows();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].set_code, "LOB-001");
        assert_eq!(rows[0].rarity_code, "(UR)");
        assert_eq!(rows[1].rarity_code, "::quartercenturysecretrare");
        assert!(rows[0].set_price.is_none() && rows[1].set_price.is_none());
    }

    #[test]
    fn card_set_rows_empty_without_block() {
        let j = r#"{"id":2,"name":"Y","type":"Spell Card"}"#;
        let c: ApiCard = serde_json::from_str(j).expect("parse");
        assert!(c.card_set_rows().is_empty());
    }
}
