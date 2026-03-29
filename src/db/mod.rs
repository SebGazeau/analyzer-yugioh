//! Accès base de données — découpage par domaine (`docs/decisions.md`, étape 3.1).

mod card_locales;
mod cards;
mod error;
mod konami;
mod migrate;
mod ygorg;

pub use card_locales::{upsert_card_locales, CardLocaleUpsertRow};
pub use cards::{
    list_card_ids, list_card_image_urls, load_all_cards, upsert_card_sets, upsert_cards, CardRow,
};
pub use error::DbError;
pub use konami::{get_konami_catalog_snapshot_json, upsert_konami_catalog_snapshot};
pub use migrate::run_migrations;
pub use ygorg::{
    clear_ygorg_unresolved, count_ygorg_name_index_rows, count_ygorg_qa_entries,
    filter_existing_card_ids, get_external_cache_revision, insert_ygorg_name_index_rows,
    list_card_ids_by_ygorg_internal_id, list_card_ids_missing_ygorg_layer,
    list_cards_for_ygorg_backfill, lookup_ygorg_id_by_exact_name, mark_ygorg_unresolved,
    set_external_cache_revision, truncate_ygorg_name_index, upsert_card_enrichment_layer,
    upsert_card_ygorg_id_map, upsert_ygorg_qa_entry, YgOrgBackfillCardRow,
    YGORG_ENRICHMENT_SOURCE, YGORG_LAYER_CARD_RAW,
};
