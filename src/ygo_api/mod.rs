//! DTO et mapping pour l'API YGOProDeck (cardinfo.php).
//! Utilisé par fetch_cards pour parser la réponse et produire les lignes à upsert en base.

mod dto;
mod mapping;

pub use dto::{
    ApiBanlistInfo, ApiCard, ApiCardImage, ApiCardPrice, ApiCardSet, ApiMiscInfo,
    CardPricesResponse, CardSetUpsertRow, CardUpsertRow, CardmarketVersion, CardsApiResponse,
};

use crate::cards_sync::{self, CardSyncError, DEFAULT_YGOPRODECK_CARDINFO_URL};

/// Corps `getCardPrices.php` : JSON ou littéral `false`.
pub(crate) fn parse_card_prices_response(text: &str) -> Result<CardPricesResponse, CardSyncError> {
    let t = text.trim();
    if t.eq_ignore_ascii_case("false") {
        return Ok(CardPricesResponse { cardmarket: None });
    }
    serde_json::from_str(t).map_err(Into::into)
}

/// Cartes d'un set (passcodes) avec métadonnées `misc=yes`.
pub async fn fetch_cards_by_set(set_name: &str) -> Result<Vec<ApiCard>, CardSyncError> {
    let base = std::env::var("YGOPRODECK_CARDINFO_URL")
        .unwrap_or_else(|_| DEFAULT_YGOPRODECK_CARDINFO_URL.to_string());
    let mut url = reqwest::Url::parse(&base)
        .map_err(|e| CardSyncError::HttpClient(format!("URL cardinfo YGOPRODECK invalide: {e}")))?;
    {
        let mut q = url.query_pairs_mut();
        q.append_pair("cardset", set_name.trim());
        q.append_pair("misc", "yes");
    }
    let body = cards_sync::fetch_cardinfo_raw(url.as_str()).await?;
    let parsed: CardsApiResponse = serde_json::from_str(&body)?;
    Ok(parsed.data)
}

/// Prix Cardmarket par version (passcode dans `cardname=`).
pub async fn fetch_card_prices(passcode: u64) -> Result<CardPricesResponse, CardSyncError> {
    let url = format!("https://ygoprodeck.com/api/card/getCardPrices.php?cardname={passcode}");
    let text = cards_sync::fetch_cardinfo_raw(&url).await?;
    parse_card_prices_response(&text)
}

#[cfg(test)]
mod fetch_tests {
    use super::*;

    #[test]
    fn parse_card_prices_false_is_ok_empty() {
        let r = parse_card_prices_response("  false  ").expect("ok");
        assert!(r.cardmarket.is_none());
    }

    #[test]
    fn parse_card_prices_json() {
        let j = r#"{"cardmarket":[{"set_name":"A","set_code":"X-","set_rarity":"Rare","set_price":"1"}]}"#;
        let r = parse_card_prices_response(j).expect("ok");
        assert_eq!(r.cardmarket.as_ref().map(|v| v.len()), Some(1));
    }
}
