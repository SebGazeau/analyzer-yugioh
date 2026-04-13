# analyzer-yugioh — Project Context

## Stack
- Backend: Rust, Actix-web
- DB: PostgreSQL via sqlx (compile-time checked queries)
- Frontend: TypeScript + Vite, plain fetch()
- Workspace crates: `analyzer-yugioh` (root), `xtask`

## Route conventions
- Routes live in `src/modules/<domain>/routes.rs`
- Each module exposes a `pub fn register(cfg: &mut web::ServiceConfig)` function
- All modules are registered in `src/app/register_modules.rs`
- Follow this pattern exactly — do not invent a new one

## Admin auth convention
- Admin routes are protected by the existing middleware in:
  `web::scope("/admin").wrap_fn(...)` calling `is_admin_allowed`
- Supports: X-Admin-Key header, JWT admin Bearer, session cookie
- New admin routes MUST be registered under this existing scope
- Do not create a new auth mechanism

## YGO Engine
- Pure logic crate: `crates/ygo-engine`
- No HTTP, no DB, no async — only structs and pure functions
- `analyzer-yugioh` depends on it as a path dependency
- The engine is called from `src/modules/ygo/routes.rs`

## Non-goals
- No scraping
- No ML
- No new auth system
- No new middleware
- Do not modify existing modules