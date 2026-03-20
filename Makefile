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

.PHONY: dev watch test test-frontend docker-up docker-down docker-dev docker-clean build-frontend assert-npm-linux

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

test-frontend: assert-npm-linux
	cd static && npm run test:frontend

docker-up:
	docker compose up --build

docker-down:
	docker compose down

# Mode dev : compile le front (TS), puis app recompile à chaque modification (cargo watch)
docker-dev: assert-npm-linux
	cd static && npm run build
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

docker-clean:
	docker compose down -v
