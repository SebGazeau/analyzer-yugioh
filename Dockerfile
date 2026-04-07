# ==============================================================================
# Image prod / Cloud Run — cible finale : runtime (voir docker-compose.yml)
# ==============================================================================
FROM rust:1.88-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache des deps (workspace : membre `xtask` obligatoire)
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY xtask ./xtask
RUN mkdir -p src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release --bin analyzer-yugioh --features gcs
RUN rm -f src/main.rs

COPY src ./src
COPY migrations ./migrations
COPY templates ./templates
RUN touch src/main.rs && cargo build --release --bin analyzer-yugioh --features gcs

# ==============================================================================
FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/analyzer-yugioh ./
COPY static ./static
COPY templates ./templates

RUN mkdir -p /app/data /storage \
    && useradd --uid 1001 --no-create-home appuser \
    && chown -R appuser /app /storage
USER appuser

ENV PORT=8080
ENV CARDS_PATH=/app/data/cards.json

EXPOSE 8080

CMD ["./analyzer-yugioh"]
