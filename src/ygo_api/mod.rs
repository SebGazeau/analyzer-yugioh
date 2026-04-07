//! DTO et mapping pour l'API YGOProDeck (cardinfo.php).
//! Utilisé par fetch_cards pour parser la réponse et produire les lignes à upsert en base.

mod dto;
mod mapping;

pub use dto::{
    ApiBanlistInfo, ApiCard, ApiCardImage, ApiCardSet, CardSetUpsertRow, CardUpsertRow,
    CardsApiResponse,
};
