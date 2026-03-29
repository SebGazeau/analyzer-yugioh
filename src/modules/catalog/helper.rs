//! Overlay image locale sur un DTO recherche.

use crate::images::ImageRepository;
use crate::shared::structs::card_search_result::CardSearchResult;
use crate::shared::structs::search_card_dto::SearchCardDto;

pub async fn overlay_search_dto_image_url(
    pool: Option<&sqlx::PgPool>,
    card: &CardSearchResult,
    dto: &mut SearchCardDto,
) {
    let Some(pool) = pool else {
        return;
    };
    let Some(url) = card.image_url() else {
        return;
    };
    let url_trimmed = url.trim();
    let urls = [url_trimmed.to_string()];
    if let Ok(map) = ImageRepository::get_ids_by_original_urls(pool, &urls).await {
        if let Some(id) = map.get(url_trimmed) {
            dto.image_url = Some(format!("/images/{}/file/desktop", id));
        }
    }
}
