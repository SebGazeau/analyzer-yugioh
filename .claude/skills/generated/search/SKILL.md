---
name: search
description: "Skill for the Search area of analyzer-yugioh. 36 symbols across 14 files."
---

# Search

36 symbols | 14 files | Cohesion: 74%

## When to Use

- Working with code in `src/`
- Understanding how for_production, for_local_development, cookie_session_middleware work
- Modifying search-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/app.rs` | test_rate_limit_data, make_app, configure_app_for_tests_production_cookies, configure_app_for_tests_rate_limit_strict_site, configure_app_for_tests_without_swagger (+1) |
| `src/shared/search/cache.rs` | empty, invalidate, empty_cache_returns_empty_vec, invalidate_clears_cache, load_from_path (+1) |
| `src/session_cookies.rs` | for_production, for_local_development, cookie_session_middleware, production_is_secure_and_strict, development_allows_http_and_lax |
| `static/js/services/search/searchApi.ts` | warnSearch, parseSearchResultsJson, fetchSearchResultsWithOutcome, fetchSearchResultsForQuery |
| `src/shared/search/filter.rs` | filter_cards, test_filter_cards, test_filter_cards_matches_name_en |
| `tests/http_integration.rs` | test_swagger_routes_absent_when_disabled, test_api_auth_token_issuer_split_from_jwt_signing_secret |
| `src/shared/utils/templates.rs` | create_template, get_template |
| `src/shared/structs/search_query.rs` | new, query |
| `src/rate_limit.rs` | permissive_for_tests |
| `src/auth/api.rs` | api_scope |

## Entry Points

Start here when exploring this area:

- **`for_production`** (Function) — `src/session_cookies.rs:16`
- **`for_local_development`** (Function) — `src/session_cookies.rs:24`
- **`cookie_session_middleware`** (Function) — `src/session_cookies.rs:33`
- **`permissive_for_tests`** (Function) — `src/rate_limit.rs:80`
- **`make_app`** (Function) — `src/app.rs:40`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `for_production` | Function | `src/session_cookies.rs` | 16 |
| `for_local_development` | Function | `src/session_cookies.rs` | 24 |
| `cookie_session_middleware` | Function | `src/session_cookies.rs` | 33 |
| `permissive_for_tests` | Function | `src/rate_limit.rs` | 80 |
| `make_app` | Function | `src/app.rs` | 40 |
| `configure_app_for_tests_production_cookies` | Function | `src/app.rs` | 121 |
| `configure_app_for_tests_rate_limit_strict_site` | Function | `src/app.rs` | 183 |
| `configure_app_for_tests_without_swagger` | Function | `src/app.rs` | 219 |
| `configure_app_for_tests_with_api_keys` | Function | `src/app.rs` | 250 |
| `api_scope` | Function | `src/auth/api.rs` | 109 |
| `create_template` | Function | `src/shared/utils/templates.rs` | 6 |
| `get_template` | Function | `src/shared/utils/templates.rs` | 10 |
| `empty` | Function | `src/shared/search/cache.rs` | 39 |
| `invalidate` | Function | `src/shared/search/cache.rs` | 83 |
| `searchApiUrl` | Function | `static/js/cardSearchApiRoutes.ts` | 17 |
| `searchLocaleQuery` | Function | `static/js/services/search/searchCardPresentation.ts` | 10 |
| `parseSearchResultsJson` | Function | `static/js/services/search/searchApi.ts` | 15 |
| `fetchSearchResultsWithOutcome` | Function | `static/js/services/search/searchApi.ts` | 27 |
| `fetchSearchResultsForQuery` | Function | `static/js/services/search/searchApi.ts` | 48 |
| `new` | Function | `src/shared/structs/search_query.rs` | 6 |

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
| `Fetch_cards → Load_from_path` | cross_community | 4 |
| `Configure_app_for_tests_with_api_keys → Peer_ip_key` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Tests | 2 calls |
| Cli | 2 calls |
| Structs | 2 calls |
| Cluster_28 | 1 calls |
| Routes | 1 calls |
| Associations | 1 calls |

## How to Explore

1. `gitnexus_context({name: "for_production"})` — see callers and callees
2. `gitnexus_query({query: "search"})` — find related execution flows
3. Read key files listed above for implementation details
