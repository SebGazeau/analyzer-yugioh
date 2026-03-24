//! Vérifications **sans base Postgres** : ordre et unicité des fichiers de migration.
//! Toujours exécuté par `cargo test`.

use std::fs;
use std::path::Path;

#[test]
fn migration_files_have_unique_sortable_versions() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");
    let read = fs::read_dir(&dir).unwrap_or_else(|e| panic!("lire migrations/: {e}"));
    let mut versions: Vec<(i64, String)> = Vec::new();
    for ent in read.flatten() {
        let name = ent.file_name().to_string_lossy().into_owned();
        if !name.ends_with(".sql") {
            continue;
        }
        let prefix = name
            .split('_')
            .next()
            .unwrap_or("")
            .parse::<i64>()
            .unwrap_or_else(|_| panic!("préfixe numérique attendu dans {name}"));
        versions.push((prefix, name));
    }
    assert!(
        versions.len() >= 5,
        "au moins quelques migrations .sql attendues, trouvé {}",
        versions.len()
    );
    versions.sort_by_key(|(v, _)| *v);
    let mut prev: Option<i64> = None;
    for (v, name) in &versions {
        if let Some(p) = prev {
            assert!(
                v > &p,
                "versions migrations non strictement croissantes : {p} puis {v} ({name})"
            );
        }
        prev = Some(*v);
    }
    let unique: std::collections::HashSet<_> = versions.iter().map(|(v, _)| v).collect();
    assert_eq!(
        unique.len(),
        versions.len(),
        "numéros de version de migration en doublon"
    );
}

#[test]
fn migrations_define_expected_ygorg_objects() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");
    let mut combined = String::new();
    let mut entries: Vec<_> = fs::read_dir(&dir)
        .unwrap()
        .flatten()
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| n.ends_with(".sql"))
        .collect();
    entries.sort();
    for name in &entries {
        let p = dir.join(name);
        combined.push_str(&fs::read_to_string(&p).unwrap_or_else(|e| {
            panic!("lire {p:?}: {e}");
        }));
    }
    for needle in [
        "CREATE TABLE IF NOT EXISTS ygorg_qa_entries",
        "idx_ygorg_qa_entries_cards_gin",
        "CREATE TABLE IF NOT EXISTS card_ygorg_id_map",
        "idx_card_ygorg_id_map_ygorg",
        "CREATE TABLE IF NOT EXISTS ygorg_en_name_index",
        "idx_card_enrichment_ygorg_card_raw",
    ] {
        assert!(
            combined.contains(needle),
            "chaîne attendue absente des migrations : {needle:?}"
        );
    }
}
