---
name: deck
description: "Skill for the Deck area of analyzer-yugioh. 28 symbols across 6 files."
---

# Deck

28 symbols | 6 files | Cohesion: 80%

## When to Use

- Working with code in `src/`
- Understanding how as_u8, validate, validate_for_save work
- Modifying deck-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/shared/structs/deck/mod.rs` | main_deck_allow_incomplete, extra_deck, side_deck, total_cards, count_total_cards (+12) |
| `src/shared/structs/deck_validation.rs` | validate, validate_for_save, parse_entries, parse_entry |
| `src/shared/structs/deck_entry.rs` | quantity, new, test_deck_entry_new |
| `src/shared/structs/deck/copy_rules.rs` | display_label, check_max_copies_per_card |
| `src/shared/structs/quantity.rs` | as_u8 |
| `src/modules/catalog/routes.rs` | validate_deck |

## Entry Points

Start here when exploring this area:

- **`as_u8`** (Function) — `src/shared/structs/quantity.rs:24`
- **`validate`** (Function) — `src/shared/structs/deck_validation.rs:61`
- **`validate_for_save`** (Function) — `src/shared/structs/deck_validation.rs:113`
- **`quantity`** (Function) — `src/shared/structs/deck_entry.rs:38`
- **`validate_deck`** (Function) — `src/modules/catalog/routes.rs:186`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `as_u8` | Function | `src/shared/structs/quantity.rs` | 24 |
| `validate` | Function | `src/shared/structs/deck_validation.rs` | 61 |
| `validate_for_save` | Function | `src/shared/structs/deck_validation.rs` | 113 |
| `quantity` | Function | `src/shared/structs/deck_entry.rs` | 38 |
| `validate_deck` | Function | `src/modules/catalog/routes.rs` | 186 |
| `main_deck_allow_incomplete` | Function | `src/shared/structs/deck/mod.rs` | 33 |
| `extra_deck` | Function | `src/shared/structs/deck/mod.rs` | 47 |
| `side_deck` | Function | `src/shared/structs/deck/mod.rs` | 61 |
| `total_cards` | Function | `src/shared/structs/deck/mod.rs` | 80 |
| `check_max_copies_per_card` | Function | `src/shared/structs/deck/copy_rules.rs` | 41 |
| `new` | Function | `src/shared/structs/deck_entry.rs` | 14 |
| `main_deck` | Function | `src/shared/structs/deck/mod.rs` | 11 |
| `parse_entries` | Function | `src/shared/structs/deck_validation.rs` | 164 |
| `parse_entry` | Function | `src/shared/structs/deck_validation.rs` | 181 |
| `count_total_cards` | Function | `src/shared/structs/deck/mod.rs` | 85 |
| `test_deck_extra_valid` | Function | `src/shared/structs/deck/mod.rs` | 163 |
| `test_deck_extra_too_many_cards` | Function | `src/shared/structs/deck/mod.rs` | 171 |
| `test_deck_side_deck_valid` | Function | `src/shared/structs/deck/mod.rs` | 186 |
| `test_deck_side_deck_too_many_cards` | Function | `src/shared/structs/deck/mod.rs` | 194 |
| `display_label` | Function | `src/shared/structs/deck/copy_rules.rs` | 33 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Create_deck_handler → Passcode` | cross_community | 6 |
| `Create_deck_handler → Card_name` | cross_community | 6 |
| `Create_deck_handler → As_str` | cross_community | 6 |
| `Update_deck_handler → Passcode` | cross_community | 6 |
| `Update_deck_handler → Card_name` | cross_community | 6 |
| `Update_deck_handler → As_str` | cross_community | 6 |
| `Create_deck_handler → New` | cross_community | 5 |
| `Create_deck_handler → Quantity` | cross_community | 5 |
| `Create_deck_handler → As_u8` | cross_community | 5 |
| `Create_deck_handler → Display_label` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Structs | 2 calls |
| Tests | 1 calls |

## How to Explore

1. `gitnexus_context({name: "as_u8"})` — see callers and callees
2. `gitnexus_query({query: "deck"})` — find related execution flows
3. Read key files listed above for implementation details
