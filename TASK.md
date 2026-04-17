# Task 4 — YGOPRODECK Data Client (two-stage price fetching)

## Context
We use two YGOPRODECK endpoints to get card data for a set:
- Official API: card list + global price signal + liquidity proxy
- Internal API: real Cardmarket prices per version

IMPORTANT: `getCardPrices.php` expects the card PASSCODE (field `id` in cardinfo.php),
NOT an internal YGOPRODECK ID. These are different values.

Do NOT create a new reqwest client.
Reuse `http_client()` from `src/cards_sync.rs`.
Follow existing patterns in `src/ygo_api/`.

## Step 1 — Extend DTOs (src/ygo_api/dto.rs)

### Add to existing ApiCard:
pub misc_info: Option<Vec<ApiMiscInfo>>,
pub card_prices: Option<Vec<ApiCardPrice>>,

### New structs:
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
    pub cardmarket_price: Option<String>, // EUR, lowest across all versions
}

// Response from getCardPrices.php
#[derive(Debug, Deserialize, Clone)]
pub struct CardPricesResponse {
    pub cardmarket: Option<Vec<CardmarketVersion>>,
}

// One version of the card on Cardmarket
#[derive(Debug, Deserialize, Clone)]
pub struct CardmarketVersion {
    pub set_name: String,
    pub set_code: String,      // truncated e.g. "LEDE-", not "LEDE-EN031"
    pub set_rarity: String,
    pub set_price: String,     // EUR as string, parse to f64
    pub set_url: Option<String>,
}

## Step 2 — Two fetch functions (src/ygo_api/mod.rs)

### Function 1: fetch all cards from a set
pub async fn fetch_cards_by_set(set_name: &str) -> Result<Vec<ApiCard>, reqwest::Error>
- Endpoint: {YGOPRODECK_CARDINFO_URL}?cardset={set_name}&misc=yes
- URL-encode set_name
- Deserialize into CardsApiResponse
- Return response.data

### Function 2: fetch Cardmarket prices for one card
pub async fn fetch_card_prices(passcode: u64) -> Result<CardPricesResponse, reqwest::Error>
- Endpoint: https://ygoprodeck.com/api/card/getCardPrices.php?cardname={passcode}
- URL is hardcoded (undocumented internal endpoint)
- If response body is `false` → return Ok(CardPricesResponse { cardmarket: None })

Handle the `false` response explicitly:
  let text = response.text().await?;
  if text.trim() == "false" {
      return Ok(CardPricesResponse { cardmarket: None });
  }
  serde_json::from_str(&text)...

## Step 3 — Mapper (src/modules/ygo/mapper.rs)

### Stage 1 — filter candidates
pub fn filter_candidates(
    cards: Vec<ApiCard>,
    set_name: &str,
    min_price_eur: f64,    // typically 2.0
) -> Vec<ApiCard>

Keep a card if ALL of these are true:
- card_prices[0].cardmarket_price parses to f64 > min_price_eur
- card_sets contains an entry where set_name matches (case-insensitive)
- rarity of that entry is NOT Common

### Stage 2 — build CardData from ApiCard + CardmarketVersion
pub fn build_card_data(
    api_card: &ApiCard,
    version: &CardmarketVersion,
) -> CardData

Rarity mapping:
  "Common"                 → Rarity::Common
  "Rare"                   → Rarity::Rare
  "Super Rare"             → Rarity::SuperRare
  "Ultra Rare"             → Rarity::UltraRare
  "Secret Rare"            → Rarity::SecretRare
  "Starlight Rare"         → Rarity::SecretRare
  "Quarter Century Secret" → Rarity::SecretRare
  anything else            → Rarity::Rare

sell_velocity from viewsweek:
  viewsweek > 5000  → 5.0
  viewsweek > 1000  → 3.0
  viewsweek > 100   → 1.5
  viewsweek > 0     → 0.5
  viewsweek == 0    → default by rarity (SecretRare→1.0, UltraRare→1.5, SuperRare→2.0, Rare→3.0)

pull_probability default by rarity:
  Common     → 0.50
  Rare       → 0.20
  SuperRare  → 0.10
  UltraRare  → 0.08
  SecretRare → 0.04

### Stage 2 orchestrator — one card, all matching versions
pub fn build_all_versions(
    api_card: &ApiCard,
    prices: &CardPricesResponse,
    set_name: &str,
) -> Vec<CardData>

- Filter prices.cardmarket where set_name matches (case-insensitive)
- Filter out versions where set_price parses to 0.0
- For each matching version → call build_card_data
- Return Vec<CardData>

## Step 4 — Route (src/modules/ygo/routes.rs)

GET /admin/ygo/set?name=:set_name&min_price=:min_price

Parameters:
- name (required) — e.g. "Legacy of Destruction"
- min_price (optional, default 2.0)

Logic:
  1. fetch_cards_by_set(name)
  2. filter_candidates(cards, name, min_price)
  3. for each candidate:
       fetch_card_prices(card.id)          ← PASSCODE, not internal ID
       build_all_versions(card, prices, name)
  4. flatten all CardData → sort by market_price DESC
  5. return JSON

Rate limiting: 100ms delay between getCardPrices calls.

Response shape:
{
  "set_name": "Legacy of Destruction",
  "cards": [...],
  "count": 18,
  "min_price_filter": 2.0,
  "warning": null
}

Error cases:
- Missing name → 400
- Empty result → 200 + warning "Set not found or no cards"
- getCardPrices fails for one card → skip, continue

## Step 5 — Update admin UI

Replace manual card entry with:
1. Text input: set name + button "Charger les cartes"
2. Loading message: "Chargement des cartes... (peut prendre quelques secondes)"
3. On success: table pre-filled from API response
4. Each row has a 🔗 icon using set_url → opens Cardmarket in new tab
5. User adjusts: pull_probability, sell_velocity, price_trend, reprint_risk
6. "Analyze" button unchanged — posts current table to POST /admin/ygo/analyze

## Constraints
- No new reqwest client — reuse http_client()
- getCardPrices.php URL is hardcoded
- Handle `false` response gracefully — never panic
- 100ms delay between getCardPrices calls
- No unwrap() anywhere
- Unit tests for: filter_candidates, rarity mapping, viewsweek→velocity,
  false response handling

---

## Plateforme — CGU et confidentialité (hors slice code)

- Rédiger une page **CGU** + **politique de confidentialité** couvrant notamment la télémétrie agrégée Fidraulis (`FIDRAULIS_INSIGHT_TELEMETRY`, POST `/insights/fidraulis/telemetry`, finalité, durée de rétention des agrégats, base légale).
- Procédure de vérification phase 0 : [`docs/fidraulis-telemetry-verification.md`](docs/fidraulis-telemetry-verification.md).