//! Contrat de schéma sur une **vraie** base Postgres.
//!
//! ```text
//! TEST_DATABASE_URL="postgres://analyzer:analyzer@127.0.0.1:5433/analyzer_yugioh" \
//!   cargo test db_live -- --ignored --nocapture
//! ```
//!
//! Ou : `make test-db` (charge `.env` si présent).

use analyzer_yugioh::db::{self, list_our_card_ids_sharing_ygorg_qa_with, upsert_ygorg_qa_entry};
use sqlx::postgres::PgPoolOptions;

/// Tables `public` attendues après application de toutes les migrations.
const REQUIRED_TABLES: &[&str] = &[
    "_sqlx_migrations",
    "admin_users",
    "card_enrichment_layers",
    "card_prices",
    "card_sets",
    "card_ygorg_id_map",
    "card_ygorg_unresolved",
    "cards",
    "deck_entries",
    "decks",
    "external_api_cache_state",
    "images",
    "site_users",
    "users",
    "ygorg_en_name_index",
    "ygorg_qa_entries",
];

/// Index critiques (associations / YGOrg / perfs catalogue).
const REQUIRED_INDEXES: &[&str] = &[
    "idx_ygorg_qa_entries_cards_gin",
    "idx_card_ygorg_id_map_ygorg",
    "idx_ygorg_en_name_index_lookup",
    "idx_card_enrichment_ygorg_card_raw",
    "idx_card_enrichment_layers_source",
];

async fn test_pool() -> sqlx::PgPool {
    let url = std::env::var("TEST_DATABASE_URL")
        .expect("TEST_DATABASE_URL requis pour les tests db_live (voir module doc)");
    PgPoolOptions::new()
        .max_connections(3)
        .connect(&url)
        .await
        .expect("connexion TEST_DATABASE_URL")
}

#[tokio::test]
#[ignore = "nécessite TEST_DATABASE_URL (make test-db)"]
async fn db_live_migrations_idempotent() {
    let pool = test_pool().await;
    db::run_migrations(&pool).await.expect("migrate 1");
    db::run_migrations(&pool)
        .await
        .expect("migrate 2 idempotent");
}

#[tokio::test]
#[ignore = "nécessite TEST_DATABASE_URL (make test-db)"]
async fn db_live_public_tables_contract() {
    let pool = test_pool().await;
    db::run_migrations(&pool).await.unwrap();
    let tables: Vec<String> = sqlx::query_scalar(
        "SELECT table_name FROM information_schema.tables \
         WHERE table_schema = 'public' ORDER BY table_name",
    )
    .fetch_all(&pool)
    .await
    .expect("liste tables");
    for t in REQUIRED_TABLES {
        assert!(
            tables.iter().any(|x| x == t),
            "table public manquante: {t} (tables={tables:?})"
        );
    }
}

#[tokio::test]
#[ignore = "nécessite TEST_DATABASE_URL (make test-db)"]
async fn db_live_critical_indexes_exist() {
    let pool = test_pool().await;
    db::run_migrations(&pool).await.unwrap();
    let names: Vec<String> =
        sqlx::query_scalar("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")
            .fetch_all(&pool)
            .await
            .expect("pg_indexes");
    for idx in REQUIRED_INDEXES {
        assert!(
            names.iter().any(|n| n == idx),
            "index manquant: {idx} (indexes={names:?})"
        );
    }
}

/// Ids réservés aux tests (hors plage YGOProDeck habituelle).
const T_CARD_A: i64 = 8_888_801;
const T_CARD_B: i64 = 8_888_802;
const T_YORG_A: i64 = 8_888_901;
const T_YORG_B: i64 = 8_888_902;
const T_QA_ID: i64 = 8_888_099;

#[tokio::test]
#[ignore = "nécessite TEST_DATABASE_URL (make test-db)"]
async fn db_live_ygorg_qa_related_query_finds_partner_card() {
    let pool = test_pool().await;
    db::run_migrations(&pool).await.unwrap();

    sqlx::query("DELETE FROM ygorg_qa_entries WHERE qa_id = $1")
        .bind(T_QA_ID)
        .execute(&pool)
        .await
        .unwrap();
    for id in [T_CARD_A, T_CARD_B] {
        sqlx::query("DELETE FROM cards WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .unwrap();
    }

    sqlx::query(
        r#"
        INSERT INTO cards (id, name, type, frame_type, card_desc) VALUES
            ($1, 'db_live QA A', 'Monster'::card_type, 'effect'::card_frame, ''),
            ($2, 'db_live QA B', 'Monster'::card_type, 'effect'::card_frame, '')
        "#,
    )
    .bind(T_CARD_A)
    .bind(T_CARD_B)
    .execute(&pool)
    .await
    .expect("insert cards test");

    sqlx::query(
        r#"
        INSERT INTO card_ygorg_id_map (card_id, ygorg_internal_id)
        VALUES ($1, $2), ($3, $4)
        ON CONFLICT (card_id) DO UPDATE SET ygorg_internal_id = EXCLUDED.ygorg_internal_id
        "#,
    )
    .bind(T_CARD_A)
    .bind(T_YORG_A)
    .bind(T_CARD_B)
    .bind(T_YORG_B)
    .execute(&pool)
    .await
    .expect("insert map");

    upsert_ygorg_qa_entry(&pool, T_QA_ID, &[T_YORG_A, T_YORG_B])
        .await
        .expect("upsert qa");

    let partners = list_our_card_ids_sharing_ygorg_qa_with(&pool, T_YORG_A, T_CARD_A)
        .await
        .expect("list qa related");
    assert_eq!(partners, vec![T_CARD_B]);

    sqlx::query("DELETE FROM ygorg_qa_entries WHERE qa_id = $1")
        .bind(T_QA_ID)
        .execute(&pool)
        .await
        .unwrap();
    for id in [T_CARD_A, T_CARD_B] {
        sqlx::query("DELETE FROM cards WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .unwrap();
    }
}
