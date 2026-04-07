---
name: catalog
description: "Skill for the Catalog area of analyzer-yugioh. 11 symbols across 7 files."
---

# Catalog

11 symbols | 7 files | Cohesion: 61%

## When to Use

- Working with code in `src/`
- Understanding how normalize_name_for_match, card_by_name, card_ids_matching_locale_search work
- Modifying catalog-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/modules/catalog/repository.rs` | ilike_substring_pattern, card_ids_matching_locale_search, fetch_card_locales_map, find_card_id_by_locale_name |
| `src/modules/catalog/routes.rs` | card_by_name, search |
| `tests/db_schema_live.rs` | db_live_card_locales_search_fetch_resolve |
| `src/shared/search/card_resolve.rs` | normalize_name_for_match |
| `src/images/repository.rs` | get_ids_by_original_urls |
| `src/shared/structs/card_search_result.rs` | image_url |
| `src/modules/catalog/helper.rs` | overlay_search_dto_image_url |

## Entry Points

Start here when exploring this area:

- **`normalize_name_for_match`** (Function) — `src/shared/search/card_resolve.rs:12`
- **`card_by_name`** (Function) — `src/modules/catalog/routes.rs:116`
- **`card_ids_matching_locale_search`** (Function) — `src/modules/catalog/repository.rs:23`
- **`fetch_card_locales_map`** (Function) — `src/modules/catalog/repository.rs:48`
- **`find_card_id_by_locale_name`** (Function) — `src/modules/catalog/repository.rs:78`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `normalize_name_for_match` | Function | `src/shared/search/card_resolve.rs` | 12 |
| `card_by_name` | Function | `src/modules/catalog/routes.rs` | 116 |
| `card_ids_matching_locale_search` | Function | `src/modules/catalog/repository.rs` | 23 |
| `fetch_card_locales_map` | Function | `src/modules/catalog/repository.rs` | 48 |
| `find_card_id_by_locale_name` | Function | `src/modules/catalog/repository.rs` | 78 |
| `get_ids_by_original_urls` | Function | `src/images/repository.rs` | 78 |
| `image_url` | Function | `src/shared/structs/card_search_result.rs` | 67 |
| `search` | Function | `src/modules/catalog/routes.rs` | 37 |
| `overlay_search_dto_image_url` | Function | `src/modules/catalog/helper.rs` | 6 |
| `db_live_card_locales_search_fetch_resolve` | Function | `tests/db_schema_live.rs` | 187 |
| `ilike_substring_pattern` | Function | `src/modules/catalog/repository.rs` | 10 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Card_by_name → Normalize_name_for_match` | cross_community | 5 |
| `Card_by_name → Card_name_en` | cross_community | 5 |
| `Card_by_name → Id` | cross_community | 5 |
| `Card_by_name → Card_desc` | cross_community | 4 |
| `Card_by_name → Parse_always_treated_as_target_name` | cross_community | 4 |
| `Card_by_name → Card_name` | cross_community | 4 |
| `Card_by_name → As_str` | cross_community | 4 |
| `Db_live_card_locales_search_fetch_resolve → New` | cross_community | 4 |
| `Search → Query` | cross_community | 3 |
| `Search → Card_name_en` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Tests | 4 calls |
| Structs | 4 calls |
| Search | 2 calls |
| Associations | 1 calls |

## How to Explore

1. `gitnexus_context({name: "normalize_name_for_match"})` — see callers and callees
2. `gitnexus_query({query: "catalog"})` — find related execution flows
3. Read key files listed above for implementation details
