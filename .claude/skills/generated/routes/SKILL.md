---
name: routes
description: "Skill for the Routes area of analyzer-yugioh. 41 symbols across 8 files."
---

# Routes

41 symbols | 8 files | Cohesion: 88%

## When to Use

- Working with code in `src/`
- Understanding how list_images, get_image, serve_image_file work
- Modifying routes-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/routes/admin_auth.rs` | bearer_token_from_http, is_privileged_admin_request, x_admin_key_from_headers, admin_key_from_request, admin_key_from_http (+8) |
| `src/routes/admin_inline_html.rs` | tpl_token_success, render_admin_token_success, error_db_unavailable, error_login_failed, tpl_connected (+6) |
| `src/routes/admin.rs` | admin_rehydrate_storage, admin_login, html_escape, admin_login_page, admin_setup (+1) |
| `src/routes/images.rs` | list_images, get_image, serve_image_file, image_record_to_json |
| `src/auth/admin_db.rs` | get_admin_by_email, count_admins, create_admin |
| `src/images/repository.rs` | get_by_id, list |
| `src/images/importer.rs` | rehydrate_storage |
| `src/app/register_modules.rs` | register_core_and_admin_routes |

## Entry Points

Start here when exploring this area:

- **`list_images`** (Function) — `src/routes/images.rs:111`
- **`get_image`** (Function) — `src/routes/images.rs:132`
- **`serve_image_file`** (Function) — `src/routes/images.rs:153`
- **`bearer_token_from_http`** (Function) — `src/routes/admin_auth.rs:44`
- **`is_privileged_admin_request`** (Function) — `src/routes/admin_auth.rs:54`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `list_images` | Function | `src/routes/images.rs` | 111 |
| `get_image` | Function | `src/routes/images.rs` | 132 |
| `serve_image_file` | Function | `src/routes/images.rs` | 153 |
| `bearer_token_from_http` | Function | `src/routes/admin_auth.rs` | 44 |
| `is_privileged_admin_request` | Function | `src/routes/admin_auth.rs` | 54 |
| `admin_rehydrate_storage` | Function | `src/routes/admin.rs` | 234 |
| `get_by_id` | Function | `src/images/repository.rs` | 128 |
| `list` | Function | `src/images/repository.rs` | 141 |
| `rehydrate_storage` | Function | `src/images/importer.rs` | 74 |
| `x_admin_key_from_headers` | Function | `src/routes/admin_auth.rs` | 13 |
| `admin_key_from_request` | Function | `src/routes/admin_auth.rs` | 23 |
| `admin_key_from_http` | Function | `src/routes/admin_auth.rs` | 28 |
| `is_admin_authorized_http` | Function | `src/routes/admin_auth.rs` | 33 |
| `is_admin_authorized` | Function | `src/routes/admin_auth.rs` | 80 |
| `is_admin_allowed` | Function | `src/routes/admin_auth.rs` | 102 |
| `register_core_and_admin_routes` | Function | `src/app/register_modules.rs` | 14 |
| `render_admin_token_success` | Function | `src/routes/admin_inline_html.rs` | 18 |
| `error_db_unavailable` | Function | `src/routes/admin_inline_html.rs` | 35 |
| `error_login_failed` | Function | `src/routes/admin_inline_html.rs` | 39 |
| `admin_login` | Function | `src/routes/admin.rs` | 75 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Admin_rehydrate_storage → Http_client` | cross_community | 8 |
| `Admin_rehydrate_storage → Blocked_hostname` | cross_community | 7 |
| `Admin_rehydrate_storage → Is_routable_public_ip` | cross_community | 7 |
| `Admin_rehydrate_storage → Host_matches_allowed_suffix` | cross_community | 7 |
| `Admin_rehydrate_storage → Max_image_fetch_bytes_from_env` | cross_community | 7 |
| `Admin_rehydrate_storage → Allowed_host_suffixes_from_env` | cross_community | 6 |
| `Import_image → X_admin_key_from_headers` | cross_community | 5 |
| `List_images → X_admin_key_from_headers` | cross_community | 5 |
| `Get_image → X_admin_key_from_headers` | cross_community | 5 |
| `Admin_rehydrate_storage → Decode_limits` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Auth | 5 calls |
| Images | 1 calls |
| Cli | 1 calls |

## How to Explore

1. `gitnexus_context({name: "list_images"})` — see callers and callees
2. `gitnexus_query({query: "routes"})` — find related execution flows
3. Read key files listed above for implementation details
