//! DTO et mapping pour l'API YGOProDeck (cardinfo.php).

use serde::Deserialize;

use super::mapping::{
    api_frame_to_db_frame, api_type_to_db_type, normalize_attribute, normalize_ban,
    stable_rarity_code,
};

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
    /// Métadonnées `misc=yes` (vues, formats, etc.).
    #[serde(default)]
    pub misc_info: Option<Vec<ApiMiscInfo>>,
    /// Signal prix global (ex. plus bas Cardmarket toutes versions).
    #[serde(default)]
    pub card_prices: Option<Vec<ApiCardPrice>>,
}

/// Bloc `misc_info[]` renvoyé par `cardinfo.php` avec `misc=yes`.
#[derive(Debug, Deserialize, Clone)]
pub struct ApiMiscInfo {
    pub views: Option<u64>,
    pub viewsweek: Option<u64>,
    pub upvotes: Option<u32>,
    pub downvotes: Option<u32>,
    pub tcg_date: Option<String>,
    pub formats: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ApiCardPrice {
    pub cardmarket_price: Option<String>,
}

/// Réponse de `getCardPrices.php`.
#[derive(Debug, Deserialize, Clone)]
pub struct CardPricesResponse {
    pub cardmarket: Option<Vec<CardmarketVersion>>,
}

/// Une version Cardmarket pour une carte.
#[derive(Debug, Deserialize, Clone)]
pub struct CardmarketVersion {
    pub set_name: String,
    pub set_code: String,
    pub set_rarity: String,
    pub set_price: String,
    #[serde(default)]
    pub set_url: Option<String>,
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
            attribute: self.attribute.as_deref().and_then(normalize_attribute),
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

    #[test]
    fn deserializes_misc_info_and_card_prices() {
        let j = r#"{"id":3,"name":"Z","type":"Spell Card","misc_info":[{"viewsweek":200,"views":1}],"card_prices":[{"cardmarket_price":"12.50"}]}"#;
        let c: ApiCard = serde_json::from_str(j).expect("parse");
        let m = c.misc_info.as_ref().expect("misc");
        assert_eq!(m[0].viewsweek, Some(200));
        let p = c.card_prices.as_ref().expect("prices");
        assert_eq!(p[0].cardmarket_price.as_deref(), Some("12.50"));
    }

    #[test]
    fn deserializes_card_prices_response_cardmarket() {
        let j = r#"{"cardmarket":[{"set_name":"LOB","set_code":"LOB-","set_rarity":"Ultra Rare","set_price":"9.99","set_url":"https://example.com/x"}]}"#;
        let r: CardPricesResponse = serde_json::from_str(j).expect("parse");
        let v = r.cardmarket.as_ref().unwrap().first().unwrap();
        assert_eq!(v.set_name, "LOB");
        assert_eq!(v.set_url.as_deref(), Some("https://example.com/x"));
    }
}
