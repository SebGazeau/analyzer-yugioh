---
name: db
description: "Skill for the Db area of analyzer-yugioh. 21 symbols across 7 files."
---

# Db

21 symbols | 7 files | Cohesion: 79%

## When to Use

- Working with code in `src/`
- Understanding how ygorg_lookup_name, upsert_card_enrichment_layer, lookup_ygorg_id_by_exact_name work
- Modifying db-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/db/ygorg.rs` | upsert_card_enrichment_layer, lookup_ygorg_id_by_exact_name, mark_ygorg_unresolved, upsert_card_ygorg_id_map, truncate_ygorg_name_index (+2) |
| `src/db/cards.rs` | count_archetype_fill_candidates, list_archetype_fill_candidates, list_archetype_fill_candidates_with_payload, update_card_archetype_null_only |
| `src/ygorganization/sync.rs` | store_card_payload, backfill_one_card, run_sync_index_mode |
| `src/ygorganization/http.rs` | ygorg_lookup_name, parse_ygorg_en_name_index |
| `src/modules/admin_sync/service.rs` | preview_card_metadata_fill_body, apply_card_metadata_fill_body |
| `src/modules/admin_sync/routes.rs` | preview_card_metadata_fill, apply_card_metadata_fill |
| `src/ygorganization.rs` | name_index_flattens_arrays_and_numbers |

## Entry Points

Start here when exploring this area:

- **`ygorg_lookup_name`** (Function) — `src/ygorganization/http.rs:160`
- **`upsert_card_enrichment_layer`** (Function) — `src/db/ygorg.rs:48`
- **`lookup_ygorg_id_by_exact_name`** (Function) — `src/db/ygorg.rs:217`
- **`mark_ygorg_unresolved`** (Function) — `src/db/ygorg.rs:235`
- **`upsert_card_ygorg_id_map`** (Function) — `src/db/ygorg.rs:256`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ygorg_lookup_name` | Function | `src/ygorganization/http.rs` | 160 |
| `upsert_card_enrichment_layer` | Function | `src/db/ygorg.rs` | 48 |
| `lookup_ygorg_id_by_exact_name` | Function | `src/db/ygorg.rs` | 217 |
| `mark_ygorg_unresolved` | Function | `src/db/ygorg.rs` | 235 |
| `upsert_card_ygorg_id_map` | Function | `src/db/ygorg.rs` | 256 |
| `run_sync_index_mode` | Function | `src/ygorganization/sync.rs` | 64 |
| `parse_ygorg_en_name_index` | Function | `src/ygorganization/http.rs` | 132 |
| `truncate_ygorg_name_index` | Function | `src/db/ygorg.rs` | 163 |
| `clear_ygorg_unresolved` | Function | `src/db/ygorg.rs` | 171 |
| `insert_ygorg_name_index_rows` | Function | `src/db/ygorg.rs` | 181 |
| `count_archetype_fill_candidates` | Function | `src/db/cards.rs` | 216 |
| `list_archetype_fill_candidates` | Function | `src/db/cards.rs` | 238 |
| `preview_card_metadata_fill_body` | Function | `src/modules/admin_sync/service.rs` | 70 |
| `preview_card_metadata_fill` | Function | `src/modules/admin_sync/routes.rs` | 99 |
| `list_archetype_fill_candidates_with_payload` | Function | `src/db/cards.rs` | 273 |
| `update_card_archetype_null_only` | Function | `src/db/cards.rs` | 297 |
| `apply_card_metadata_fill_body` | Function | `src/modules/admin_sync/service.rs` | 103 |
| `apply_card_metadata_fill` | Function | `src/modules/admin_sync/routes.rs` | 131 |
| `store_card_payload` | Function | `src/ygorganization/sync.rs` | 116 |
| `backfill_one_card` | Function | `src/ygorganization/sync.rs` | 132 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Apply_card_metadata_fill → Card_name` | cross_community | 6 |
| `Apply_card_metadata_fill → As_str` | cross_community | 6 |
| `Apply_card_metadata_fill → Regex_material_start` | cross_community | 5 |
| `Apply_card_metadata_fill → Archetype_candidate_word_count_ok` | cross_community | 5 |
| `Apply_card_metadata_fill → Sanitize_archetype_candidate` | cross_community | 5 |
| `Apply_card_metadata_fill → Regex_quoted_monster` | cross_community | 5 |
| `Enrich_ygorganization → Clear_ygorg_unresolved` | cross_community | 4 |
| `Enrich_ygorganization → Truncate_ygorg_name_index` | cross_community | 4 |
| `Enrich_ygorganization → Parse_ygorg_en_name_index` | cross_community | 4 |
| `Enrich_ygorganization → Insert_ygorg_name_index_rows` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Ygorganization | 3 calls |
| Admin_sync | 2 calls |
| Cluster_37 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ygorg_lookup_name"})` — see callers and callees
2. `gitnexus_query({query: "db"})` — find related execution flows
3. Read key files listed above for implementation details
