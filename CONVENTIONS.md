# Code Conventions

## Rust
- No unwrap(), no expect() in production code — use ? and thiserror
- No premature abstraction: no traits unless used in 2+ places
- Async only where actix-web requires it (handlers) — engine is sync
- sqlx: compile-time checked queries (query_as! macro), migrations in /migrations

## Error handling
- Each crate defines its own Error enum via thiserror
- Handlers return Result<HttpResponse, MyError> where MyError impls ResponseError

## Route handler pattern (follow exactly)
// src/modules/<domain>/routes.rs
pub fn register(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/<domain>")
            .route("/...", web::get().to(handler_fn))
    );
}

## Frontend
- Plain fetch() — no axios, no client library
- Types shared via manually written TS interfaces matching Rust serde output
- API base path for admin: /admin/ygo/...

## Tests
- Pure engine functions: unit tests inline #[cfg(test)]
- Naming: test_<what>_when_<condition>
- Test edge cases explicitly: empty vecs, zero values, extreme probabilities