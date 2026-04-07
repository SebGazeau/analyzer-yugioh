---
name: konami-catalog
description: "Skill for the Konami_catalog area of analyzer-yugioh. 22 symbols across 10 files."
---

# Konami_catalog

22 symbols | 10 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how sync_ygoprodeck_locales, sync_pack_card_locales, absolute_konami_url work
- Modifying konami_catalog-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/konami_catalog/scrape.rs` | absolute_konami_url, normalize_card_list_name, parse_pack_listing_card_rows, parse_card_detail_passcode_desc, normalize_pack_label (+2) |
| `src/konami_catalog.rs` | absolute_url_appends_request_locale, parse_pack_listing_minimal, parse_detail_passcode_and_desc, parse_minimal_html |
| `src/konami_catalog/sync.rs` | sync_pack_card_locales, sync_pack_index |
| `src/db/konami.rs` | get_konami_catalog_snapshot_json, upsert_konami_catalog_snapshot |
| `src/konami_catalog/http.rs` | sleep_backoff, fetch_html |
| `src/card_locales_sync.rs` | sync_ygoprodeck_locales |
| `src/db/cards.rs` | list_card_ids |
| `src/db/card_locales.rs` | upsert_card_locales |
| `src/cli/locales_konami.rs` | run |
| `src/konami_catalog/config.rs` | pack_list_url |

## Entry Points

Start here when exploring this area:

- **`sync_ygoprodeck_locales`** (Function) — `src/card_locales_sync.rs:46`
- **`sync_pack_card_locales`** (Function) — `src/konami_catalog/sync.rs:59`
- **`absolute_konami_url`** (Function) — `src/konami_catalog/scrape.rs:81`
- **`parse_pack_listing_card_rows`** (Function) — `src/konami_catalog/scrape.rs:111`
- **`parse_card_detail_passcode_desc`** (Function) — `src/konami_catalog/scrape.rs:142`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `sync_ygoprodeck_locales` | Function | `src/card_locales_sync.rs` | 46 |
| `sync_pack_card_locales` | Function | `src/konami_catalog/sync.rs` | 59 |
| `absolute_konami_url` | Function | `src/konami_catalog/scrape.rs` | 81 |
| `parse_pack_listing_card_rows` | Function | `src/konami_catalog/scrape.rs` | 111 |
| `parse_card_detail_passcode_desc` | Function | `src/konami_catalog/scrape.rs` | 142 |
| `get_konami_catalog_snapshot_json` | Function | `src/db/konami.rs` | 39 |
| `list_card_ids` | Function | `src/db/cards.rs` | 62 |
| `upsert_card_locales` | Function | `src/db/card_locales.rs` | 20 |
| `run` | Function | `src/cli/locales_konami.rs` | 8 |
| `sync_pack_index` | Function | `src/konami_catalog/sync.rs` | 19 |
| `parse_pack_index_html` | Function | `src/konami_catalog/scrape.rs` | 26 |
| `packs_to_json` | Function | `src/konami_catalog/scrape.rs` | 63 |
| `fetch_html` | Function | `src/konami_catalog/http.rs` | 27 |
| `pack_list_url` | Function | `src/konami_catalog/config.rs` | 11 |
| `upsert_konami_catalog_snapshot` | Function | `src/db/konami.rs` | 8 |
| `absolute_url_appends_request_locale` | Function | `src/konami_catalog.rs` | 40 |
| `parse_pack_listing_minimal` | Function | `src/konami_catalog.rs` | 47 |
| `parse_detail_passcode_and_desc` | Function | `src/konami_catalog.rs` | 56 |
| `normalize_card_list_name` | Function | `src/konami_catalog/scrape.rs` | 102 |
| `parse_minimal_html` | Function | `src/konami_catalog.rs` | 31 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Run → Http_client` | cross_community | 5 |
| `Run → Sleep_backoff` | cross_community | 5 |
| `Run → Cardinfo_base_url` | cross_community | 4 |
| `Run → Sleep_backoff` | cross_community | 4 |
| `Run → Sleep_backoff` | cross_community | 4 |
| `Run → Normalize_pack_label` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cli | 2 calls |
| Cluster_38 | 1 calls |
| Cluster_35 | 1 calls |
| Tests | 1 calls |

## How to Explore

1. `gitnexus_context({name: "sync_ygoprodeck_locales"})` — see callers and callees
2. `gitnexus_query({query: "konami_catalog"})` — find related execution flows
3. Read key files listed above for implementation details
