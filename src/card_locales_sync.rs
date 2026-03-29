//! Synchronisation de la table `card_locales` depuis YGOProDeck (`misc=yes&language=`).

use sqlx::PgPool;
use thiserror::Error;

use crate::cards_sync::{self, DEFAULT_YGOPRODECK_CARDINFO_URL};
use crate::db::{self, CardLocaleUpsertRow, DbError};
use crate::ygo_api::CardsApiResponse;

#[derive(Debug, Error)]
pub enum LocaleSyncError {
    #[error(transparent)]
    YgoHttp(#[from] crate::cards_sync::CardSyncError),
    #[error("YGOProDeck: JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("YGOProDeck: `data` vide pour la locale `{0}`")]
    EmptyPayload(String),
    #[error(transparent)]
    Db(#[from] DbError),
}

fn cardinfo_base_url() -> String {
    let u = std::env::var("YGOPRODECK_CARDINFO_URL")
        .unwrap_or_else(|_| DEFAULT_YGOPRODECK_CARDINFO_URL.to_string());
    u.split('?')
        .next()
        .unwrap_or(&u)
        .trim()
        .trim_end_matches('/')
        .to_string()
}

/// URL `cardinfo.php` pour une langue API (ex. `fr`, `de`, `it`, `pt`).
pub fn ygoprodeck_cardinfo_url_for_locale(locale: &str) -> String {
    let base = cardinfo_base_url();
    format!("{base}?misc=yes&language={locale}")
}

#[derive(Debug, Default, Clone)]
pub struct YgoLocaleSyncStats {
    pub locales_processed: Vec<String>,
    pub rows_filtered_per_locale: Vec<usize>,
    pub total_upserts: u64,
}

/// Pour chaque code locale, télécharge l’API traduite et upsert les lignes dont `card_id` est en base.
pub async fn sync_ygoprodeck_locales(
    pool: &PgPool,
    locales: &[String],
) -> Result<YgoLocaleSyncStats, LocaleSyncError> {
    let ids = db::list_card_ids(pool).await?;
    let mut stats = YgoLocaleSyncStats::default();

    for raw in locales {
        let loc = raw.trim();
        if loc.is_empty() {
            continue;
        }
        let url = ygoprodeck_cardinfo_url_for_locale(loc);
        tracing::info!(%url, "card_locales_sync: YGOProDeck");
        let body = cards_sync::fetch_cardinfo_raw(&url).await?;
        let api: CardsApiResponse = serde_json::from_str(&body)?;
        if api.data.is_empty() {
            return Err(LocaleSyncError::EmptyPayload(loc.to_string()));
        }

        let rows: Vec<CardLocaleUpsertRow> = api
            .data
            .iter()
            .filter_map(|c| {
                let id = c.id as i64;
                if !ids.contains(&id) {
                    return None;
                }
                Some(CardLocaleUpsertRow {
                    card_id: id,
                    locale: loc.to_string(),
                    name: c.name.clone(),
                    card_desc: c.desc.clone().unwrap_or_default(),
                    source: "ygoprodeck".into(),
                })
            })
            .collect();

        let n = rows.len();
        stats.total_upserts += db::upsert_card_locales(pool, &rows).await?;
        stats.locales_processed.push(loc.to_string());
        stats.rows_filtered_per_locale.push(n);
    }

    Ok(stats)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// Les tests modifient `YGOPRODECK_CARDINFO_URL` : pas de parallèle sur ce module.
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    /// SAFETY : `ENV_LOCK` garantit qu’un seul test touche ces variables à la fois.
    unsafe fn env_remove_ygoprodeck_url() {
        std::env::remove_var("YGOPRODECK_CARDINFO_URL");
    }

    /// SAFETY : idem [`env_remove_ygoprodeck_url`].
    unsafe fn env_set_ygoprodeck_url(val: &str) {
        std::env::set_var("YGOPRODECK_CARDINFO_URL", val);
    }

    #[test]
    fn ygoprodeck_url_fr_misc_and_language() {
        let _g = ENV_LOCK.lock().expect("env lock");
        unsafe { env_remove_ygoprodeck_url() };
        let u = ygoprodeck_cardinfo_url_for_locale("fr");
        assert!(
            u.contains("misc=yes") && u.contains("language=fr"),
            "got {u}"
        );
        assert!(u.ends_with("cardinfo.php?misc=yes&language=fr"), "got {u}");
    }

    #[test]
    fn ygoprodeck_url_strips_query_from_env_base() {
        let _g = ENV_LOCK.lock().expect("env lock");
        unsafe {
            env_set_ygoprodeck_url("https://example.com/api/cardinfo.php?legacy=1&x=y");
        }
        let u = ygoprodeck_cardinfo_url_for_locale("de");
        unsafe { env_remove_ygoprodeck_url() };
        assert!(
            !u.contains("legacy") && !u.contains("x=y"),
            "query env ne doit pas fuir: {u}"
        );
        assert!(u.contains("misc=yes") && u.contains("language=de"), "{u}");
    }
}
