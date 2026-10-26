# analyzer-yugioh

[![CI](https://github.com/SebGazeau/analyzer-yugioh/actions/workflows/ci.yml/badge.svg)](https://github.com/SebGazeau/analyzer-yugioh/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-0.1.8-blue)
![Rust](https://img.shields.io/badge/rust-1.88-orange?logo=rust)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Vite-3178C6?logo=typescript&logoColor=white)

Application web d'**analyse de decks Yu-Gi-Oh!** : recherche de cartes, construction et sauvegarde de decks, statistiques de pioche et suggestions de synergies.

Le serveur est écrit en **Rust (Actix Web)**. Le catalogue de cartes est stocké dans **PostgreSQL** et alimenté depuis des sources publiques (YGOProDeck, base de données Konami, YGOrganization).

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Commandes utiles](#commandes-utiles)
- [Sous-commandes CLI](#sous-commandes-cli)
- [Tests et qualité](#tests-et-qualité)
- [Architecture](#architecture)
- [Déploiement](#déploiement)
- [Documentation](#documentation)
- [Contribuer](#contribuer)
- [Licence et mentions légales](#licence-et-mentions-légales)

---

## Fonctionnalités

- **Recherche de cartes** avec filtres (type, attribut, niveau, limitations…) et aperçu de chaque carte.
- **Deck builder** : Main / Extra / Side deck, glisser-déposer, catégories, validation des règles (taille, limites), import/export `.ydk` et JSON.
- **Statistiques** : composition du deck, simulation de mains de départ et histogrammes de probabilité de pioche (moteur pur dans `crates/ygo-engine`).
- **Insights** : suggestions de synergies et cartes associées, enrichies par les Q&A de YGOrganization.
- **Catalogue multilingue** (fr, de, it, pt, ja, ko…) synchronisé depuis YGOProDeck et Konami.
- **Pipeline d'images** : import HTTP sécurisé (protection SSRF), conversion WebP (original, desktop, mobile), stockage local ou Google Cloud Storage.
- **Comptes utilisateurs** : inscription (avec Cloudflare Turnstile en option), connexion, decks par utilisateur, **2FA TOTP**, réinitialisation de mot de passe.
- **Espace admin** : synchronisation du catalogue, rechargement du cache, jobs d'enrichissement.
- **API JSON documentée** (OpenAPI / Swagger UI) protégée par JWT.

## Stack technique

| Couche | Technologies |
|--------|--------------|
| Serveur | Rust 1.88, Actix Web 4, Tera (templates HTML), SQLx |
| Base de données | PostgreSQL 16 (image `pgvector` en local), migrations SQL versionnées |
| Front | TypeScript, Vite, `fetch()` natif |
| Tests | `cargo test`, Vitest (jsdom), Playwright (e2e) |
| Auth | Sessions cookie, JWT, Argon2, TOTP, rate limiting par IP |
| Infra | Docker, GitHub Actions, Google Cloud Run, Cloud SQL, GCS |

## Prérequis

- [Rust](https://rustup.rs/). La version est fixée par `rust-toolchain.toml` (1.88), et `rustup` l'installe automatiquement.
- [Node.js](https://nodejs.org/) 22+ et npm, pour compiler le front.
- [Docker](https://docs.docker.com/get-docker/) et Docker Compose, pour PostgreSQL et pgAdmin.
- *(Optionnel)* [`cargo-watch`](https://crates.io/crates/cargo-watch), pour `make watch`.

> **WSL** : Node/npm doivent être installés **dans la distribution Linux**, pas utilisés depuis Windows. Le `Makefile` vérifie ce point.

## Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/SebGazeau/analyzer-yugioh.git
cd analyzer-yugioh

# 2. Configurer l'environnement
cp .env.example .env
# puis éditer .env (au minimum ADMIN_SECRET, SESSION_SECRET, DATABASE_URL)

# 3. Installer les dépendances front
(cd static && npm install)

# 4. Démarrer PostgreSQL (+ pgAdmin)
docker compose up -d db pgadmin

# 5. Appliquer les migrations
make db-migrate

# 6. Importer le catalogue de cartes
cargo run -- sync-cards

# 7. Lancer le serveur (compile aussi le front)
make dev
```

L'application est disponible sur <http://localhost:8080> et pgAdmin sur <http://localhost:5050>.

### Tout en Docker

```bash
make docker-up              # build complet, proche de la prod (Cloud Run)
make docker-dev MIGRATE=1   # mode dev : code monté en volume + cargo watch
```

## Configuration

Toutes les variables sont documentées dans [`.env.example`](.env.example). Les principales :

| Variable | Rôle |
|----------|------|
| `PORT` | Port HTTP (défaut `8080`) |
| `DATABASE_URL` | Connexion Postgres. Depuis l'hôte, utiliser `127.0.0.1:5433` |
| `CARDS_PATH` | Fichier JSON de cartes utilisé en secours |
| `ADMIN_SECRET` | Clé admin (header `X-Admin-Key`) |
| `SESSION_SECRET` | Signature des cookies de session (≥ 32 caractères en prod) |
| `JWT_SECRET` / `API_ISSUER_SECRET` | Signature des JWT et émission de jetons pour l'API |
| `APP_ENV` | `production` active les contrôles de sécurité au démarrage |
| `ENABLE_SWAGGER_UI` | Active Swagger UI en production (désactivé par défaut) |
| `STORAGE_BACKEND` | `local` ou `gcs` (feature Cargo `gcs`) |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Captcha Cloudflare à l'inscription |

> Ne committez jamais votre fichier `.env`.

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `make dev` | Compile le front puis lance le serveur |
| `make watch` | Relance le serveur à chaque sauvegarde |
| `make test` | Tests Rust (unitaires, intégration HTTP, cohérence des migrations) |
| `make test-db` | Tests sur une vraie base Postgres (`TEST_DATABASE_URL`) |
| `make test-frontend` | Tests Vitest du front |
| `make lint` | `cargo clippy` |
| `make db-migrate` | Applique les migrations sur `DATABASE_URL` |
| `make docker-up` / `make docker-down` | Démarre / arrête la stack Docker |
| `make docker-dev` | Stack Docker en mode développement |
| `make docker-clean` | Arrête la stack et supprime les volumes |
| `make enrichment-job` | Lance les passes d'enrichissement YGOrg et métadonnées |

## Sous-commandes CLI

Le binaire expose des sous-commandes qui s'exécutent sans démarrer le serveur HTTP :

```bash
cargo run -- migrate               # applique les migrations SQL
cargo run -- sync-cards            # importe/met à jour les cartes depuis YGOProDeck
cargo run -- sync-locales-ygo      # traductions YGOProDeck (CARD_LOCALES_YGO)
cargo run -- konami-pack-index     # indexe les boosters Konami (KONAMI_LOCALE)
cargo run -- sync-locales-konami   # traductions depuis la base Konami
```

## Tests et qualité

```bash
cargo test                          # backend
cargo clippy --all-targets          # lint Rust
cargo fmt --check                   # formatage
cd static && npm run typecheck      # types TS
cd static && npm test               # tests unitaires front (Vitest)
cd static && npm run test:e2e       # tests end-to-end (Playwright)
```

La CI GitHub Actions s'exécute sur chaque pull request. Elle enchaîne qualité (fmt, clippy, tests, typecheck), intégration (Postgres 16 + `db_live` + Playwright) et un build Docker de contrôle.

## Architecture

```
analyzer-yugioh/
├── src/
│   ├── main.rs, app.rs      # point d'entrée, montage Actix
│   ├── modules/<domaine>/   # routes HTTP par domaine (catalog, decks, ygo, account…)
│   ├── auth/                # sessions, JWT, CSRF, Turnstile
│   ├── db/                  # requêtes SQL partagées
│   ├── images/, storage/    # pipeline d'images, stockage local/GCS
│   └── cli/                 # sous-commandes
├── crates/ygo-engine/       # moteur de calcul pur (sans HTTP, DB ni async)
├── migrations/              # schéma SQL versionné
├── templates/               # vues Tera
├── static/                  # sources TypeScript, CSS, build Vite (dist/)
├── tests/                   # tests d'intégration Rust
├── xtask/                   # outillage (bump de version)
└── docs/                    # documentation technique
```

Chaque domaine expose une fonction `register(cfg)` dans `src/modules/<domaine>/routes.rs`, enregistrée dans `src/app/register_modules.rs`. Pour plus de détails, voir [`docs/contexte-projet.md`](docs/contexte-projet.md) et [`CONVENTIONS.md`](CONVENTIONS.md).

## Déploiement

Pousser un tag `v*` déclenche le workflow [`deploy-gcp.yml`](.github/workflows/deploy-gcp.yml). Il relance les contrôles qualité, puis déploie sur **Google Cloud Run** avec **Cloud SQL** (Postgres) et **Cloud Storage** (images).

Guides :

- [Cloud Run](docs/deploy-gcp-cloud-run.md)
- [Cloud SQL](docs/deploy-gcp-cloudsql.md)
- [Cloud Storage](docs/deploy-gcp-gcs.md)
- [Sécurité en production](docs/deploy-security-prod.md)

## Documentation

| Sujet | Fichier |
|-------|---------|
| Contexte et onboarding | [docs/contexte-projet.md](docs/contexte-projet.md) |
| Authentification | [docs/auth.md](docs/auth.md) |
| Schéma de base de données | [docs/db_schema.md](docs/db_schema.md) |
| Migrations | [docs/db-migrations.md](docs/db-migrations.md) |
| Synchronisation des cartes | [docs/card-sync-job.md](docs/card-sync-job.md) |
| Pipeline d'enrichissement | [docs/enrichment-pipeline.md](docs/enrichment-pipeline.md) |
| Pipeline d'images | [docs/pipeline_images.md](docs/pipeline_images.md) |
| Locales des cartes | [docs/card-locales.md](docs/card-locales.md) |
| Décisions d'architecture | [docs/decisions.md](docs/decisions.md) |
| Roadmap | [docs/roadmap-produit-et-technique.md](docs/roadmap-produit-et-technique.md) |
| Charte graphique | [docs/charte-graphique.md](docs/charte-graphique.md) |

Lorsque le serveur tourne et que Swagger UI est activé, la documentation de l'API est servie sur `/swagger-ui/`.

## Contribuer

1. Créer une branche depuis `main` (`git checkout -b feat/ma-fonctionnalite`).
2. Respecter les conventions décrites dans [`CONVENTIONS.md`](CONVENTIONS.md) : pas de `unwrap()` en production, erreurs via `thiserror`, requêtes SQLx vérifiées.
3. Vérifier en local que `cargo fmt`, `make lint`, `make test` et `make test-frontend` passent.
4. Ouvrir une pull request vers `main`. La CI doit être verte.

## Licence et mentions légales

Aucune licence n'est définie pour le moment. Sauf accord de l'auteur, tous droits sont réservés.

*Yu-Gi-Oh!* est une marque déposée de **Konami Digital Entertainment** et de **Kazuki Takahashi / Shueisha**. Ce projet est un outil de fan non officiel. Il n'est ni affilié à Konami ni approuvé par Konami. Les données et images de cartes appartiennent à leurs ayants droit respectifs. Elles proviennent notamment de [YGOProDeck](https://ygoprodeck.com/), de la [base de données officielle Konami](https://www.db.yugioh-card.com/) et de [YGOrganization](https://ygorganization.com/).
