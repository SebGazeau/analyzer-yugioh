//! Client HTTP pour l’API JSON documentée sous **YGOrganization** (`db.ygorganization.com/about/api`).
//! Réponses servies sur **`db.ygoresources.com`**.
//!
//! Les **IDs dans `/data/card/{id}`** sont les IDs internes YGResources, **pas** les passcodes YGOProDeck.
//! On résout via **`/data/idx/card/name/en`** (sync locale en base) puis nom EN / `name` de `cards`.

mod error_stats;
mod http;
mod sync;

pub use error_stats::{RunStats, YgOrgError};
pub use http::{
    YGORG_API_BASE, build_http_client, fetch_card_json, fetch_manifest, parse_manifest_card_ids,
    parse_qa_detail, parse_ygorg_en_name_index, ygorg_lookup_name,
};
pub use sync::{
    EnrichQuery, clamp_max, run_backfill_mode, run_enrichment, run_init_revision,
    run_manifest_mode, run_sync_index_mode, run_sync_recent_qa,
};

#[cfg(test)]
mod tests {
    use super::{
        parse_manifest_card_ids, parse_qa_detail, parse_ygorg_en_name_index, ygorg_lookup_name,
    };
    use serde_json::json;

    #[test]
    fn manifest_extracts_sorted_unique_ids() {
        let v = json!({
            "data": {
                "card": {
                    "103": 1,
                    "7": 1,
                    "42": 1
                }
            }
        });
        let ids = parse_manifest_card_ids(&v).expect("parse");
        assert_eq!(ids, vec![7, 42, 103]);
    }

    #[test]
    fn name_index_flattens_arrays_and_numbers() {
        let v = json!({
            "A": [1_i64, 2_i64],
            "B": 3_i64
        });
        let mut rows = parse_ygorg_en_name_index(&v).expect("parse");
        rows.sort();
        assert_eq!(
            rows,
            vec![("A".into(), 1), ("A".into(), 2), ("B".into(), 3),]
        );
    }

    #[test]
    fn ygorg_lookup_name_prefers_name_en() {
        assert_eq!(
            ygorg_lookup_name("Français", Some("Dark Magician")),
            "Dark Magician"
        );
        assert_eq!(ygorg_lookup_name("Soleil", None), "Soleil");
    }

    #[test]
    fn parse_qa_detail_reads_cards_and_id() {
        let v = json!({
            "cards": [12749, 12750],
            "qaData": { "en": { "id": 999, "question": "Q" } }
        });
        let (qid, c) = parse_qa_detail(&v, 1).expect("parse");
        assert_eq!(qid, 999);
        assert_eq!(c, vec![12749, 12750]);
        let fallback = json!({ "cards": [1_i64] });
        let (qid2, c2) = parse_qa_detail(&fallback, 42).expect("parse");
        assert_eq!(qid2, 42);
        assert_eq!(c2, vec![1_i64]);
    }

    #[test]
    fn parse_qa_detail_none_when_no_numeric_cards() {
        assert!(parse_qa_detail(&json!({ "cards": [] }), 1).is_none());
        assert!(parse_qa_detail(&json!({ "cards": ["x", null] }), 1).is_none());
        assert!(parse_qa_detail(&json!({}), 1).is_none());
    }
}
