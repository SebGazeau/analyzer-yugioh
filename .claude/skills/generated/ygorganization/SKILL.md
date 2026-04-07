---
name: ygorganization
description: "Skill for the Ygorganization area of analyzer-yugioh. 24 symbols across 5 files."
---

# Ygorganization

24 symbols | 5 files | Cohesion: 85%

## When to Use

- Working with code in `src/`
- Understanding how run_init_revision, run_manifest_mode, run_backfill_mode work
- Modifying ygorganization-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/ygorganization/http.rs` | build_http_client, parse_cache_revision, fetch_card_json, fetch_manifest, parse_manifest_card_ids (+3) |
| `src/db/ygorg.rs` | get_external_cache_revision, set_external_cache_revision, list_cards_for_ygorg_backfill, count_ygorg_name_index_rows, list_card_ids_by_ygorg_internal_id (+2) |
| `src/ygorganization/sync.rs` | run_init_revision, run_manifest_mode, run_backfill_mode, clamp_max, run_enrichment (+1) |
| `src/ygorganization.rs` | manifest_extracts_sorted_unique_ids, parse_qa_detail_reads_cards_and_id |
| `src/modules/admin_sync/routes.rs` | enrich_ygorganization |

## Entry Points

Start here when exploring this area:

- **`run_init_revision`** (Function) — `src/ygorganization/sync.rs:97`
- **`run_manifest_mode`** (Function) — `src/ygorganization/sync.rs:179`
- **`run_backfill_mode`** (Function) — `src/ygorganization/sync.rs:289`
- **`clamp_max`** (Function) — `src/ygorganization/sync.rs:352`
- **`run_enrichment`** (Function) — `src/ygorganization/sync.rs:356`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `run_init_revision` | Function | `src/ygorganization/sync.rs` | 97 |
| `run_manifest_mode` | Function | `src/ygorganization/sync.rs` | 179 |
| `run_backfill_mode` | Function | `src/ygorganization/sync.rs` | 289 |
| `clamp_max` | Function | `src/ygorganization/sync.rs` | 352 |
| `run_enrichment` | Function | `src/ygorganization/sync.rs` | 356 |
| `build_http_client` | Function | `src/ygorganization/http.rs` | 20 |
| `fetch_card_json` | Function | `src/ygorganization/http.rs` | 43 |
| `fetch_manifest` | Function | `src/ygorganization/http.rs` | 54 |
| `parse_manifest_card_ids` | Function | `src/ygorganization/http.rs` | 67 |
| `get_external_cache_revision` | Function | `src/db/ygorg.rs` | 14 |
| `set_external_cache_revision` | Function | `src/db/ygorg.rs` | 26 |
| `list_cards_for_ygorg_backfill` | Function | `src/db/ygorg.rs` | 134 |
| `count_ygorg_name_index_rows` | Function | `src/db/ygorg.rs` | 209 |
| `list_card_ids_by_ygorg_internal_id` | Function | `src/db/ygorg.rs` | 278 |
| `enrich_ygorganization` | Function | `src/modules/admin_sync/routes.rs` | 56 |
| `run_sync_recent_qa` | Function | `src/ygorganization/sync.rs` | 19 |
| `parse_qa_detail` | Function | `src/ygorganization/http.rs` | 86 |
| `fetch_recent_qa_ids` | Function | `src/ygorganization/http.rs` | 106 |
| `fetch_qa_json` | Function | `src/ygorganization/http.rs` | 123 |
| `upsert_ygorg_qa_entry` | Function | `src/db/ygorg.rs` | 292 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Enrich_ygorganization → Get_external_cache_revision` | intra_community | 4 |
| `Enrich_ygorganization → Set_external_cache_revision` | intra_community | 4 |
| `Enrich_ygorganization → RunStats` | intra_community | 4 |
| `Enrich_ygorganization → Clear_ygorg_unresolved` | cross_community | 4 |
| `Enrich_ygorganization → Truncate_ygorg_name_index` | cross_community | 4 |
| `Enrich_ygorganization → Parse_ygorg_en_name_index` | cross_community | 4 |
| `Enrich_ygorganization → Insert_ygorg_name_index_rows` | cross_community | 4 |
| `Enrich_ygorganization → Count_ygorg_name_index_rows` | intra_community | 4 |
| `Enrich_ygorganization → Fetch_manifest` | intra_community | 4 |
| `Run_enrichment → Parse_cache_revision` | intra_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Db | 4 calls |

## How to Explore

1. `gitnexus_context({name: "run_init_revision"})` — see callers and callees
2. `gitnexus_query({query: "ygorganization"})` — find related execution flows
3. Read key files listed above for implementation details
