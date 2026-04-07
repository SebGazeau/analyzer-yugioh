---
name: auth
description: "Skill for the Auth area of analyzer-yugioh. 33 symbols across 11 files."
---

# Auth

33 symbols | 11 files | Cohesion: 85%

## When to Use

- Working with code in `src/`
- Understanding how logout, get_user_by_pseudo, authenticate work
- Modifying auth-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/auth/jwt.rs` | jwt_decoding_validation, decode_token, create_token, from_request, create_token_roundtrip (+3) |
| `src/auth/api.rs` | auth_token, resolve_api_token_issuer_secret, explicit_issuer_wins_no_fallback, empty_explicit_falls_back_to_jwt, missing_explicit_uses_jwt (+1) |
| `src/auth/user_db.rs` | get_user_by_pseudo, authenticate, validate_password_strength, normalize_and_validate_pseudo, create_user |
| `src/auth/csrf.rs` | verify_csrf_token, csrf_rejected, invalidate_csrf_token, sync_csrf_token |
| `src/auth/web.rs` | logout, dashboard |
| `src/auth/admin_db.rs` | verify_password, hash_password |
| `src/modules/site_auth/register/routes.rs` | register_submit, register_page |
| `src/modules/site_auth/logout/routes.rs` | logout_submit |
| `src/modules/site_auth/login/routes.rs` | login_submit |
| `src/auth/session.rs` | require_session |

## Entry Points

Start here when exploring this area:

- **`logout`** (Function) — `src/auth/web.rs:22`
- **`get_user_by_pseudo`** (Function) — `src/auth/user_db.rs:77`
- **`authenticate`** (Function) — `src/auth/user_db.rs:132`
- **`verify_csrf_token`** (Function) — `src/auth/csrf.rs:23`
- **`csrf_rejected`** (Function) — `src/auth/csrf.rs:34`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `logout` | Function | `src/auth/web.rs` | 22 |
| `get_user_by_pseudo` | Function | `src/auth/user_db.rs` | 77 |
| `authenticate` | Function | `src/auth/user_db.rs` | 132 |
| `verify_csrf_token` | Function | `src/auth/csrf.rs` | 23 |
| `csrf_rejected` | Function | `src/auth/csrf.rs` | 34 |
| `invalidate_csrf_token` | Function | `src/auth/csrf.rs` | 39 |
| `verify_password` | Function | `src/auth/admin_db.rs` | 29 |
| `register_submit` | Function | `src/modules/site_auth/register/routes.rs` | 42 |
| `logout_submit` | Function | `src/modules/site_auth/logout/routes.rs` | 14 |
| `login_submit` | Function | `src/modules/site_auth/login/routes.rs` | 17 |
| `decode_token` | Function | `src/auth/jwt.rs` | 22 |
| `create_token` | Function | `src/auth/jwt.rs` | 32 |
| `auth_token` | Function | `src/auth/api.rs` | 45 |
| `dashboard` | Function | `src/auth/web.rs` | 34 |
| `require_session` | Function | `src/auth/session.rs` | 9 |
| `sync_csrf_token` | Function | `src/auth/csrf.rs` | 11 |
| `index` | Function | `src/modules/pages/routes.rs` | 12 |
| `register_page` | Function | `src/modules/site_auth/register/routes.rs` | 19 |
| `resolve_api_token_issuer_secret` | Function | `src/auth/api.rs` | 18 |
| `validate_password_strength` | Function | `src/auth/user_db.rs` | 18 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Import_image → Jwt_decoding_validation` | cross_community | 4 |
| `List_images → Jwt_decoding_validation` | cross_community | 4 |
| `Get_image → Jwt_decoding_validation` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "logout"})` — see callers and callees
2. `gitnexus_query({query: "auth"})` — find related execution flows
3. Read key files listed above for implementation details
