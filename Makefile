# ==============================================================================
# Workflow de développement
#
#  make dev        -> démarre le serveur (cargo run, redémarre en ~5s)
#  make watch      -> redémarre automatiquement à chaque sauvegarde
#  make test       -> lance tous les tests (unitaires + intégration HTTP)
#  make docker-up  -> simulation Cloud Run complète (build Docker, ~3 min)
#  make docker-down -> stoppe le container
#  make docker-dev  -> mode dev : code monté en volume, recompile à chaque modification (cargo watch)
#  make docker-clean -> stoppe + efface le volume (repart de zéro)
# ==============================================================================

include .env
export

.PHONY: dev watch test test-frontend docker-up docker-down docker-dev docker-clean build-frontend

build-frontend:
	cd static && npm run build

dev: build-frontend
	cargo run

watch: build-frontend
	cargo watch -x run

test:
	cargo test

test-frontend:
	cd static && npm run test:frontend

docker-up:
	docker compose up --build

docker-down:
	docker compose down

# Mode dev : compile le front (TS), puis app recompile à chaque modification (cargo watch)
docker-dev:
	cd static && npm run build
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

docker-clean:
	docker compose down -v
