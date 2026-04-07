---
name: storage
description: "Skill for the Storage area of analyzer-yugioh. 20 symbols across 3 files."
---

# Storage

20 symbols | 3 files | Cohesion: 98%

## When to Use

- Working with code in `src/`
- Understanding how new, new, from_config work
- Modifying storage-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/storage/local.rs` | new, resolve, store, get, exists (+4) |
| `src/storage/gcs.rs` | object_name, is_not_found, store, get, exists (+1) |
| `src/storage/mod.rs` | from_config, block_on, from_config_local_store_get, from_config_gcs_without_bucket_fails, from_config_gcs_with_bucket_requires_async |

## Entry Points

Start here when exploring this area:

- **`new`** (Function) — `src/storage/local.rs:15`
- **`new`** (Function) — `src/storage/gcs.rs:131`
- **`from_config`** (Function) — `src/storage/mod.rs:32`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `new` | Function | `src/storage/local.rs` | 15 |
| `new` | Function | `src/storage/gcs.rs` | 131 |
| `from_config` | Function | `src/storage/mod.rs` | 32 |
| `resolve` | Function | `src/storage/local.rs` | 19 |
| `store` | Function | `src/storage/local.rs` | 27 |
| `get` | Function | `src/storage/local.rs` | 37 |
| `exists` | Function | `src/storage/local.rs` | 47 |
| `block_on` | Function | `src/storage/local.rs` | 58 |
| `local_storage_store_and_get` | Function | `src/storage/local.rs` | 67 |
| `local_storage_get_missing_returns_none` | Function | `src/storage/local.rs` | 80 |
| `local_storage_exists` | Function | `src/storage/local.rs` | 89 |
| `object_name` | Function | `src/storage/gcs.rs` | 57 |
| `is_not_found` | Function | `src/storage/gcs.rs` | 65 |
| `store` | Function | `src/storage/gcs.rs` | 73 |
| `get` | Function | `src/storage/gcs.rs` | 90 |
| `exists` | Function | `src/storage/gcs.rs` | 104 |
| `block_on` | Function | `src/storage/mod.rs` | 88 |
| `from_config_local_store_get` | Function | `src/storage/mod.rs` | 97 |
| `from_config_gcs_without_bucket_fails` | Function | `src/storage/mod.rs` | 113 |
| `from_config_gcs_with_bucket_requires_async` | Function | `src/storage/mod.rs` | 128 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → New` | cross_community | 4 |
| `Db_live_card_locales_search_fetch_resolve → New` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "new"})` — see callers and callees
2. `gitnexus_query({query: "storage"})` — find related execution flows
3. Read key files listed above for implementation details
