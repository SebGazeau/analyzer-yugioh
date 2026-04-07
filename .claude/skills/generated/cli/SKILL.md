---
name: cli
description: "Skill for the Cli area of analyzer-yugioh. 11 symbols across 7 files."
---

# Cli

11 symbols | 7 files | Cohesion: 60%

## When to Use

- Working with code in `src/`
- Understanding how new, rate_limit_state_from_env, from_config_async work
- Modifying cli-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/rate_limit.rs` | new, rate_limit_state_from_env, parse_u32, fixed_window_blocks_after_max, fixed_window_independent_keys |
| `src/storage/mod.rs` | from_config_async |
| `src/storage/gcs.rs` | connect |
| `src/cli/sync_cards.rs` | run |
| `src/cli/migrate.rs` | run |
| `src/cli/locales_ygo.rs` | run |
| `src/cli/konami_pack_index.rs` | run |

## Entry Points

Start here when exploring this area:

- **`new`** (Function) — `src/rate_limit.rs:22`
- **`rate_limit_state_from_env`** (Function) — `src/rate_limit.rs:91`
- **`from_config_async`** (Function) — `src/storage/mod.rs:58`
- **`connect`** (Function) — `src/storage/gcs.rs:45`
- **`run`** (Function) — `src/cli/sync_cards.rs:7`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `new` | Function | `src/rate_limit.rs` | 22 |
| `rate_limit_state_from_env` | Function | `src/rate_limit.rs` | 91 |
| `from_config_async` | Function | `src/storage/mod.rs` | 58 |
| `connect` | Function | `src/storage/gcs.rs` | 45 |
| `run` | Function | `src/cli/sync_cards.rs` | 7 |
| `run` | Function | `src/cli/migrate.rs` | 9 |
| `run` | Function | `src/cli/locales_ygo.rs` | 6 |
| `run` | Function | `src/cli/konami_pack_index.rs` | 8 |
| `parse_u32` | Function | `src/rate_limit.rs` | 92 |
| `fixed_window_blocks_after_max` | Function | `src/rate_limit.rs` | 166 |
| `fixed_window_independent_keys` | Function | `src/rate_limit.rs` | 175 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Run → Http_client` | cross_community | 5 |
| `Run → Sleep_backoff` | cross_community | 5 |
| `Run → Http_client` | cross_community | 5 |
| `Run → Sleep_backoff` | cross_community | 5 |
| `Main → New` | cross_community | 4 |
| `Run → CardUpsertRow` | cross_community | 4 |
| `Run → Api_type_to_db_type` | cross_community | 4 |
| `Run → CardSetUpsertRow` | cross_community | 4 |
| `Run → Stable_rarity_code` | cross_community | 4 |
| `Run → Cardinfo_base_url` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Tests | 4 calls |
| Konami_catalog | 2 calls |
| Storage | 1 calls |
| Ygo_api | 1 calls |

## How to Explore

1. `gitnexus_context({name: "new"})` — see callers and callees
2. `gitnexus_query({query: "cli"})` — find related execution flows
3. Read key files listed above for implementation details
