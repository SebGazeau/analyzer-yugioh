---
name: structs
description: "Skill for the Structs area of analyzer-yugioh. 25 symbols across 9 files."
---

# Structs

25 symbols | 9 files | Cohesion: 72%

## When to Use

- Working with code in `src/`
- Understanding how card_name, passcode, id work
- Modifying structs-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/shared/structs/card_search_result.rs` | id, card_desc, new, try_from, test_card_search_result_new (+4) |
| `src/shared/search/card_resolve.rs` | resolve_passcode_by_name, parse_always_treated_as_target_name, canonical_deck_passcode, card, canonical_maps_white_dragon_to_albaz_passcode |
| `src/shared/structs/card_name.rs` | as_str, try_from, from_str |
| `src/shared/structs/deck_entry.rs` | card_name, passcode |
| `src/shared/structs/quantity.rs` | try_from, from_int |
| `src/modules/decks/routes.rs` | get_deck_handler |
| `src/modules/decks/repository.rs` | get_deck_with_entries |
| `src/modules/decks/helper.rs` | entries_to_insert |
| `src/shared/structs/deck/copy_rules.rs` | for_entry |

## Entry Points

Start here when exploring this area:

- **`card_name`** (Function) — `src/shared/structs/deck_entry.rs:30`
- **`passcode`** (Function) — `src/shared/structs/deck_entry.rs:34`
- **`id`** (Function) — `src/shared/structs/card_search_result.rs:71`
- **`card_desc`** (Function) — `src/shared/structs/card_search_result.rs:95`
- **`resolve_passcode_by_name`** (Function) — `src/shared/search/card_resolve.rs:17`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `card_name` | Function | `src/shared/structs/deck_entry.rs` | 30 |
| `passcode` | Function | `src/shared/structs/deck_entry.rs` | 34 |
| `id` | Function | `src/shared/structs/card_search_result.rs` | 71 |
| `card_desc` | Function | `src/shared/structs/card_search_result.rs` | 95 |
| `resolve_passcode_by_name` | Function | `src/shared/search/card_resolve.rs` | 17 |
| `parse_always_treated_as_target_name` | Function | `src/shared/search/card_resolve.rs` | 41 |
| `canonical_deck_passcode` | Function | `src/shared/search/card_resolve.rs` | 58 |
| `get_deck_handler` | Function | `src/modules/decks/routes.rs` | 124 |
| `get_deck_with_entries` | Function | `src/modules/decks/repository.rs` | 73 |
| `entries_to_insert` | Function | `src/modules/decks/helper.rs` | 12 |
| `new` | Function | `src/shared/structs/card_search_result.rs` | 28 |
| `card_name` | Function | `src/shared/structs/card_search_result.rs` | 75 |
| `as_str` | Function | `src/shared/structs/card_search_result.rs` | 83 |
| `to_search_dto` | Function | `src/shared/structs/card_search_result.rs` | 100 |
| `as_str` | Function | `src/shared/structs/card_name.rs` | 33 |
| `for_entry` | Function | `src/shared/structs/deck/copy_rules.rs` | 18 |
| `try_from` | Function | `src/shared/structs/card_search_result.rs` | 181 |
| `test_card_search_result_new` | Function | `src/shared/structs/card_search_result.rs` | 223 |
| `test_to_search_dto` | Function | `src/shared/structs/card_search_result.rs` | 273 |
| `card` | Function | `src/shared/search/card_resolve.rs` | 92 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Create_deck_handler → Passcode` | cross_community | 6 |
| `Create_deck_handler → Card_name` | cross_community | 6 |
| `Create_deck_handler → As_str` | cross_community | 6 |
| `Update_deck_handler → Passcode` | cross_community | 6 |
| `Update_deck_handler → Card_name` | cross_community | 6 |
| `Update_deck_handler → As_str` | cross_community | 6 |
| `Fetch_cards → Card_name` | cross_community | 6 |
| `Fetch_cards → As_str` | cross_community | 6 |
| `Apply_card_metadata_fill → Card_name` | cross_community | 6 |
| `Apply_card_metadata_fill → As_str` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Catalog | 1 calls |
| Associations | 1 calls |
| Decks | 1 calls |
| Tests | 1 calls |

## How to Explore

1. `gitnexus_context({name: "card_name"})` — see callers and callees
2. `gitnexus_query({query: "structs"})` — find related execution flows
3. Read key files listed above for implementation details
