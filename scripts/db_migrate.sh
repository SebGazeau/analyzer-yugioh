#!/usr/bin/env bash
# Applique les migrations SQL (même logique qu’au démarrage de l’app, via sqlx embarqué).
# Prérequis : DATABASE_URL (ou fichier .env à la racine du dépôt).
#
# Usage :
#   ./scripts/db_migrate.sh
#   DATABASE_URL='postgres://…' ./scripts/db_migrate.sh
#
# CI / image release : après build,
#   ./analyzer-yugioh migrate
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "db_migrate.sh: définir DATABASE_URL (ou remplir .env)." >&2
  exit 1
fi
export DATABASE_URL

if [[ -x ./target/release/analyzer-yugioh ]]; then
  exec ./target/release/analyzer-yugioh migrate
fi
if [[ -x ./target/debug/analyzer-yugioh ]]; then
  exec ./target/debug/analyzer-yugioh migrate
fi

exec cargo run --quiet -- migrate
