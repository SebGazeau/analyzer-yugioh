---
name: images
description: "Skill for the Images area of analyzer-yugioh. 31 symbols across 8 files."
---

# Images

31 symbols | 8 files | Cohesion: 82%

## When to Use

- Working with code in `src/`
- Understanding how process_image, max_image_fetch_bytes_from_env, import_image work
- Modifying images-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/images/process.rs` | decode_limits, process_image, resize_to_max_width, encode_lossless, encode_quality (+5) |
| `src/images/url_policy.rs` | allowed_host_suffixes_from_env, blocked_hostname, is_routable_public_ip, host_matches_allowed_suffix, validate_image_import_url (+2) |
| `src/images/fetch.rs` | max_image_fetch_bytes_from_env, max_bytes_default_when_env_missing, http_client, fetch_image_bytes, fetch_image_bytes_trusted (+1) |
| `src/images/importer.rs` | fetch_with_retry, rehydrate_one, import_one, run |
| `src/routes/images.rs` | import_image |
| `src/routes/admin.rs` | admin_import |
| `src/images/repository.rs` | list_original_urls |
| `src/db/cards.rs` | list_card_image_urls |

## Entry Points

Start here when exploring this area:

- **`process_image`** (Function) — `src/images/process.rs:55`
- **`max_image_fetch_bytes_from_env`** (Function) — `src/images/fetch.rs:31`
- **`import_image`** (Function) — `src/routes/images.rs:65`
- **`allowed_host_suffixes_from_env`** (Function) — `src/images/url_policy.rs:53`
- **`fetch_image_bytes`** (Function) — `src/images/fetch.rs:44`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `process_image` | Function | `src/images/process.rs` | 55 |
| `max_image_fetch_bytes_from_env` | Function | `src/images/fetch.rs` | 31 |
| `import_image` | Function | `src/routes/images.rs` | 65 |
| `allowed_host_suffixes_from_env` | Function | `src/images/url_policy.rs` | 53 |
| `fetch_image_bytes` | Function | `src/images/fetch.rs` | 44 |
| `fetch_image_bytes_trusted` | Function | `src/images/fetch.rs` | 52 |
| `validate_image_import_url` | Function | `src/images/url_policy.rs` | 68 |
| `admin_import` | Function | `src/routes/admin.rs` | 211 |
| `list_original_urls` | Function | `src/images/repository.rs` | 58 |
| `run` | Function | `src/images/importer.rs` | 139 |
| `list_card_image_urls` | Function | `src/db/cards.rs` | 198 |
| `decode_limits` | Function | `src/images/process.rs` | 41 |
| `resize_to_max_width` | Function | `src/images/process.rs` | 84 |
| `encode_lossless` | Function | `src/images/process.rs` | 92 |
| `encode_quality` | Function | `src/images/process.rs` | 98 |
| `process_image_produces_three_variants` | Function | `src/images/process.rs` | 120 |
| `process_image_invalid_bytes_fails` | Function | `src/images/process.rs` | 130 |
| `process_error_display` | Function | `src/images/process.rs` | 136 |
| `process_image_input_exceeds_max_bytes_returns_too_large` | Function | `src/images/process.rs` | 144 |
| `process_image_dimensions_over_limit_returns_decode_limits` | Function | `src/images/process.rs` | 155 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Admin_import → Http_client` | cross_community | 8 |
| `Admin_rehydrate_storage → Http_client` | cross_community | 8 |
| `Admin_import → Blocked_hostname` | cross_community | 7 |
| `Admin_import → Is_routable_public_ip` | cross_community | 7 |
| `Admin_import → Host_matches_allowed_suffix` | cross_community | 7 |
| `Admin_import → Max_image_fetch_bytes_from_env` | cross_community | 7 |
| `Admin_rehydrate_storage → Blocked_hostname` | cross_community | 7 |
| `Admin_rehydrate_storage → Is_routable_public_ip` | cross_community | 7 |
| `Admin_rehydrate_storage → Host_matches_allowed_suffix` | cross_community | 7 |
| `Admin_rehydrate_storage → Max_image_fetch_bytes_from_env` | cross_community | 7 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Routes | 1 calls |

## How to Explore

1. `gitnexus_context({name: "process_image"})` — see callers and callees
2. `gitnexus_query({query: "images"})` — find related execution flows
3. Read key files listed above for implementation details
