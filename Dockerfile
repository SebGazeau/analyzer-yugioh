# ==============================================================================
# Stage 1 — Builder
# ==============================================================================
# Rust 1.88+ requis par la dépendance transitive home@0.5.12
FROM rust:1.88-slim AS builder

WORKDIR /app

# Dépendances système pour rustls/reqwest (TLS natif)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Astuce cache : on compile les dépendances avant de copier les sources.
# Si seul le code change, Docker réutilise la couche des dépendances.
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src && echo 'fn main(){}' > src/main.rs
RUN cargo build --release --bin analyzer-yugioh
RUN rm -f src/main.rs

# Copier les sources et migrations (sqlx::migrate! résout ./migrations à la compilation)
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release --bin analyzer-yugioh

# ==============================================================================
# Stage 2 — Runtime (image minimale)
# ==============================================================================
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# ca-certificates : HTTPS pour /admin/fetch_cards ; curl : healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Binaire compilé
COPY --from=builder /app/target/release/analyzer-yugioh ./

# Assets statiques
COPY static ./static
COPY templates ./templates

# Répertoire pour cards.json + stockage images (LOCAL_STORAGE_PATH)
RUN mkdir -p /app/data /storage

# Utilisateur non-root (bonne pratique Cloud Run)
RUN useradd --uid 1001 --no-create-home appuser && chown -R appuser /app /storage
USER appuser

# PORT est injecté par Cloud Run (ou docker-compose) au démarrage
ENV PORT=8080
ENV CARDS_PATH=/app/data/cards.json

EXPOSE 8080

CMD ["./analyzer-yugioh"]
