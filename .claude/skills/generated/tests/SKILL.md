---
name: tests
description: "Skill for the Tests area of analyzer-yugioh. 68 symbols across 8 files."
---

# Tests

68 symbols | 8 files | Cohesion: 72%

## When to Use

- Working with code in `tests/`
- Understanding how configure_app_for_tests, get, count work
- Modifying tests-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tests/http_integration.rs` | id_session_set_cookie, test_index_returns_200, test_openapi_json_when_swagger_enabled, test_search_short_query_returns_400, test_search_valid_query_returns_200 (+50) |
| `tests/db_schema_live.rs` | test_pool, db_live_migrations_idempotent, db_live_public_tables_contract, db_live_critical_indexes_exist, db_live_ygorg_qa_related_query_finds_partner_card |
| `src/app.rs` | configure_app_for_tests, configure_app_for_tests_with_auth |
| `src/modules/associations/repository.rs` | ygorg_internal_id_for_our_card, list_our_card_ids_sharing_ygorg_qa_with |
| `src/shared/search/cache.rs` | get |
| `src/modules/catalog/routes.rs` | count |
| `src/db/migrate.rs` | run_migrations |
| `src/modules/associations/routes.rs` | associations_qa_related |

## Entry Points

Start here when exploring this area:

- **`configure_app_for_tests`** (Function) — `src/app.rs:152`
- **`get`** (Function) — `src/shared/search/cache.rs:78`
- **`count`** (Function) — `src/modules/catalog/routes.rs:180`
- **`configure_app_for_tests_with_auth`** (Function) — `src/app.rs:291`
- **`run_migrations`** (Function) — `src/db/migrate.rs:7`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `configure_app_for_tests` | Function | `src/app.rs` | 152 |
| `get` | Function | `src/shared/search/cache.rs` | 78 |
| `count` | Function | `src/modules/catalog/routes.rs` | 180 |
| `configure_app_for_tests_with_auth` | Function | `src/app.rs` | 291 |
| `run_migrations` | Function | `src/db/migrate.rs` | 7 |
| `associations_qa_related` | Function | `src/modules/associations/routes.rs` | 124 |
| `ygorg_internal_id_for_our_card` | Function | `src/modules/associations/repository.rs` | 77 |
| `list_our_card_ids_sharing_ygorg_qa_with` | Function | `src/modules/associations/repository.rs` | 90 |
| `id_session_set_cookie` | Function | `tests/http_integration.rs` | 17 |
| `test_index_returns_200` | Function | `tests/http_integration.rs` | 66 |
| `test_openapi_json_when_swagger_enabled` | Function | `tests/http_integration.rs` | 79 |
| `test_search_short_query_returns_400` | Function | `tests/http_integration.rs` | 106 |
| `test_search_valid_query_returns_200` | Function | `tests/http_integration.rs` | 120 |
| `test_search_with_locale_param_returns_200` | Function | `tests/http_integration.rs` | 135 |
| `test_admin_reload_cache_from_db_without_postgres_returns_503` | Function | `tests/http_integration.rs` | 152 |
| `test_count_returns_0_with_empty_cache` | Function | `tests/http_integration.rs` | 168 |
| `test_card_by_name_empty_returns_400` | Function | `tests/http_integration.rs` | 180 |
| `test_card_by_name_not_found_returns_null` | Function | `tests/http_integration.rs` | 190 |
| `test_validate_deck_valid_returns_200` | Function | `tests/http_integration.rs` | 204 |
| `test_validate_deck_too_few_returns_400` | Function | `tests/http_integration.rs` | 228 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Test_post_register_without_pool_returns_error_page → Peer_ip_key` | cross_community | 5 |
| `Test_post_register_without_pool_returns_error_page → Admin_login_post_path` | cross_community | 5 |
| `Test_post_register_without_pool_returns_error_page → Check` | cross_community | 5 |
| `Test_post_register_without_pool_returns_error_page → Site_auth_post_path` | cross_community | 5 |
| `Test_post_login_without_pool_redirects_to_index → Peer_ip_key` | cross_community | 5 |
| `Test_post_login_without_pool_redirects_to_index → Admin_login_post_path` | cross_community | 5 |
| `Test_post_login_without_pool_redirects_to_index → Check` | cross_community | 5 |
| `Test_post_login_without_pool_redirects_to_index → Site_auth_post_path` | cross_community | 5 |
| `Db_live_card_locales_search_fetch_resolve → New` | cross_community | 4 |
| `Test_post_register_without_pool_returns_error_page → Cookie_session_middleware` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Search | 12 calls |
| Cli | 1 calls |
| Ygorganization | 1 calls |

## How to Explore

1. `gitnexus_context({name: "configure_app_for_tests"})` — see callers and callees
2. `gitnexus_query({query: "tests"})` — find related execution flows
3. Read key files listed above for implementation details
