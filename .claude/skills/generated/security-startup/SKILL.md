---
name: security-startup
description: "Skill for the Security_startup area of analyzer-yugioh. 24 symbols across 6 files."
---

# Security_startup

24 symbols | 6 files | Cohesion: 79%

## When to Use

- Working with code in `src/`
- Understanding how from_env, is_production, app_environment_from_env work
- Modifying security_startup-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/security_startup/mod.rs` | is_production, secret_32, validate_production_both_ok, validate_production_admin_missing, validate_production_session_missing (+3) |
| `src/main.rs` | resolve_port, resolve_cards_path, main, session_key_from_secret, validate_production_or_exit |
| `src/security_startup/env.rs` | app_environment_from_env, parse_app_env_raw, swagger_ui_enabled, swagger_ui_enabled_from_env |
| `src/config.rs` | from_env, config_from_env_defaults, config_from_env_storage_local |
| `src/security_startup/secrets.rs` | secret_ok_for_production, validate_production_secrets, log_dev_secret_warnings |
| `src/shared/search/cache.rs` | from_cards |

## Entry Points

Start here when exploring this area:

- **`from_env`** (Function) — `src/config.rs:34`
- **`is_production`** (Function) — `src/security_startup/mod.rs:22`
- **`app_environment_from_env`** (Function) — `src/security_startup/env.rs:3`
- **`parse_app_env_raw`** (Function) — `src/security_startup/env.rs:11`
- **`swagger_ui_enabled`** (Function) — `src/security_startup/env.rs:25`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `from_env` | Function | `src/config.rs` | 34 |
| `is_production` | Function | `src/security_startup/mod.rs` | 22 |
| `app_environment_from_env` | Function | `src/security_startup/env.rs` | 3 |
| `parse_app_env_raw` | Function | `src/security_startup/env.rs` | 11 |
| `swagger_ui_enabled` | Function | `src/security_startup/env.rs` | 25 |
| `swagger_ui_enabled_from_env` | Function | `src/security_startup/env.rs` | 39 |
| `from_cards` | Function | `src/shared/search/cache.rs` | 46 |
| `validate_production_secrets` | Function | `src/security_startup/secrets.rs` | 38 |
| `log_dev_secret_warnings` | Function | `src/security_startup/secrets.rs` | 52 |
| `resolve_port` | Function | `src/main.rs` | 45 |
| `resolve_cards_path` | Function | `src/main.rs` | 52 |
| `main` | Function | `src/main.rs` | 68 |
| `session_key_from_secret` | Function | `src/main.rs` | 210 |
| `config_from_env_defaults` | Function | `src/config.rs` | 90 |
| `config_from_env_storage_local` | Function | `src/config.rs` | 104 |
| `secret_32` | Function | `src/security_startup/mod.rs` | 60 |
| `validate_production_both_ok` | Function | `src/security_startup/mod.rs` | 65 |
| `validate_production_admin_missing` | Function | `src/security_startup/mod.rs` | 72 |
| `validate_production_session_missing` | Function | `src/security_startup/mod.rs` | 85 |
| `validate_production_admin_too_short` | Function | `src/security_startup/mod.rs` | 94 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → New` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Search | 5 calls |
| Cli | 3 calls |
| Tests | 1 calls |
| Admin_sync | 1 calls |
| Auth | 1 calls |

## How to Explore

1. `gitnexus_context({name: "from_env"})` — see callers and callees
2. `gitnexus_query({query: "security_startup"})` — find related execution flows
3. Read key files listed above for implementation details
