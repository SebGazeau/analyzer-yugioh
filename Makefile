# ==============================================================================
# Workflow de développement
#
#  make dev        -> démarre le serveur (cargo run, redémarre en ~5s)
#  make watch      -> redémarre automatiquement à chaque sauvegarde
#  make test       -> lance tous les tests (unitaires + intégration HTTP + cohérence migrations)
#  make test-db    -> tests schéma Postgres (TEST_DATABASE_URL + migrations ignorées)
#  make db-migrate -> applique les migrations (DATABASE_URL)
#  make docker-up  -> simulation Cloud Run complète (build Docker, ~3 min)
#  make docker-down -> stoppe le container
#  make docker-dev  -> mode dev : code monté en volume, recompile à chaque modification (cargo watch)
#  make docker-dev MIGRATE=1 -> idem, après avoir appliqué les migrations (réseau Docker, host db OK)
#  make docker-db-migrate -> migrations seules dans le conteneur dev (DATABASE_URL=@db:…)
#  make docker-clean -> stoppe + efface le volume (repart de zéro)
# ==============================================================================

include .env
export

COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: dev watch test test-db test-frontend lint migrate db-migrate docker-up docker-down docker-dev docker-db-migrate docker-clean build-frontend assert-npm-linux enrichment-job

# Sous WSL, si npm vient de Windows, les scripts lancent CMD.EXE avec un cwd UNC
# (\\wsl.localhost\...) : vite n'est pas trouvé. Il faut Node/npm installés dans la distro WSL.
assert-npm-linux:
	@NPM_PATH="$$(command -v npm 2>/dev/null)"; \
	if [ -z "$$NPM_PATH" ]; then \
	  echo "make: npm est absent du PATH." >&2; exit 1; \
	fi; \
	case "$$NPM_PATH" in /mnt/[a-z]/*) \
	  echo "make: npm pointe vers Windows ($$NPM_PATH)." >&2; \
	  echo "Installe Node dans WSL (ex: sudo apt install nodejs npm, ou fnm/nvm) et mets-le avant le PATH Windows." >&2; \
	  exit 1 ;; \
	esac

build-frontend: assert-npm-linux
	cd static && npm run build

dev: build-frontend
	cargo run

watch: build-frontend
	cargo watch -x run

test:
	cargo test

# Migrations SQL sur la base pointée par DATABASE_URL (voir scripts/db_migrate.sh).
migrate: db-migrate
db-migrate:
	@bash scripts/db_migrate.sh

# Tests schéma + requêtes YGOrg Q&A sur une vraie Postgres (charge .env si présent).
test-db:
	@set -a; [ ! -f .env ] || . ./.env; set +a; \
	if [ -z "$${TEST_DATABASE_URL:-}" ]; then \
	  echo "make test-db: définir TEST_DATABASE_URL (ex. postgres://analyzer:analyzer@127.0.0.1:5433/analyzer_yugioh)" >&2; \
	  exit 1; \
	fi; \
	cargo test db_live -- --ignored --nocapture

test-frontend: assert-npm-linux
	cd static && npm run test:frontend

# Rust : imports/variables inutilisés (CI recommandé). Front : `cd static && npm run lint:ts-unused` (cible stricte, pas encore verte partout).
lint:
	cargo clippy --all-targets -- -W unused

docker-up:
	docker compose up --build

docker-down:
	docker compose down

# Migrations sur la DB du compose (hostname `db` résolu dans le conteneur).
docker-db-migrate:
	$(COMPOSE_DEV) run --rm --build app cargo run -- migrate

# Mode dev : compile le front (TS), puis app recompile à chaque modification (cargo watch)
# Optionnel : MIGRATE=1 pour lancer `cargo run -- migrate` dans le réseau Docker avant le watch.
docker-dev: assert-npm-linux
	cd static && npm run build
	@if [ "$(MIGRATE)" = "1" ]; then \
	  echo "make: migrations (conteneur app, réseau Docker)…"; \
	  $(COMPOSE_DEV) run --rm --build app cargo run -- migrate; \
	fi
	$(COMPOSE_DEV) up --build

docker-clean:
	docker compose down -v

# Passes YGOrg + apply_card_metadata_fill (plafonds bas : voir docs/enrichment-job.md).
enrichment-job:
	@chmod +x scripts/enrichment_job.sh
	@set -a; [ ! -f .env ] || . ./.env; set +a; \
	  ENRICHMENT_BASE_URL="$${ENRICHMENT_BASE_URL:-http://localhost:8080}" \
	  ./scripts/enrichment_job.sh
