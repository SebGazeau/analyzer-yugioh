# Contexte du projet — analyzer-yugioh

Document de synthèse pour onboarding et pour donner du contexte aux outils (IDE, assistants). Les détails vivent dans les fichiers cités.

## Objectif

Application web **Yu-Gi-Oh** : analyse de deck, recherche de cartes, construction / sauvegarde de decks, stats. Le catalogue peut venir d’un fichier JSON local et/ou d’une **base PostgreSQL** alimentée via l’API externe (fetch admin).

## Stack

| Couche | Technologie |
|--------|-------------|
| Serveur | **Rust**, **Actix Web 4**, **Tera** (HTML), **SQLx** (Postgres) |
| API doc | **utoipa** + Swagger UI (`/api` si JWT configuré) |
| Auth | Sessions cookie (`actix-session`), **JWT** pour `/api`, enregistrement / login utilisateurs site, admin via `X-Admin-Key` |
| Front servi | Fichiers sous `static/` + templates `templates/` |
| Front build | **TypeScript**, **Vite** (build vers `static/dist/`), tests **Vitest** (+ **Playwright** e2e) |
| Données | **PostgreSQL** (image **pgvector** en local Docker), migrations SQL dans `migrations/` |
| Stockage images | **Local** ou **GCS** (feature Cargo `gcs`) |

## Arborescence utile

```
analyzer-yugioh/
├── src/
│   ├── main.rs          # Entrée, env, pool SQL, cache cartes, sous-commandes CLI
│   ├── lib.rs           # Exports + make_app pour tests
│   ├── app.rs           # Montage Actix (modules, static, session, admin, api)
│   ├── modules/         # Routes HTTP par domaine (style vertical)
│   │   ├── pages/       # GET /
│   │   ├── catalog/     # /search, /card, /count, /validate_deck + repository (locales lecture)
│   │   ├── associations/# catalogue enrichi + Q&A YGOrg
│   │   ├── admin_sync/  # /admin/fetch_cards, reload_cache, enrich YGOrg, metadata fill…
│   │   ├── site_auth/   # register / login / logout formulaires site
│   │   ├── decks/       # CRUD /decks
│   │   ├── template_error.rs
│   │   └── mod.rs       # CARDS_PATH_DEFAULT
│   ├── db/              # SQL partagé : cartes, YGOrg, Konami, migrations, upsert card_locales…
│   ├── routes/          # admin HTML (login, setup), images (import, serve)
│   ├── auth/            # jwt, session, api web, user_db, admin_db
│   ├── shared/          # Types deck, recherche, cache, enums Yu-Gi-Oh
│   ├── images/          # Pipeline fetch / traitement / repo
│   ├── storage/         # Abstraction local vs GCS
│   ├── card_metadata_fill.rs  # Heuristiques archétype (admin)
│   ├── cards_sync.rs, card_locales_sync.rs, konami_catalog.rs, ygorganization.rs…
│   └── ygo_api.rs       # Parse / types API YGOProDeck
├── migrations/          # Schéma SQL versionné (sqlx migrate)
├── templates/           # Tera (.html)
├── static/
│   ├── js/              # TS sources (deck, search, stats, init/*, api.ts…)
│   ├── css/             # Design system (tokens, pages, components)
│   └── dist/            # Sortie Vite (à builder avant run prod-like)
├── theory/              # Référence migration front (plan, tokens, api.ts théorique)
├── docs/                # auth, schéma DB, décisions, pipelines, ce fichier
├── docker-compose.yml   # db + pgadmin + app
├── docker-compose.dev.yml  # Override : volume code + cargo watch
├── Dockerfile / Dockerfile.dev
└── Makefile             # dev, test, build front, docker-*
```

## Routes HTTP (aperçu)

Les routes métier vivent sous **`src/modules/*/routes.rs`** ; **`src/routes/`** garde surtout admin HTML et images. Aperçu :

- **Pages** : `/` (`modules/pages`), builder / suggestions via templates + static.
- **JSON / API courant** : `/search`, `/card`, `POST /validate_deck` (`modules/catalog`), CRUD decks (`modules/decks`).
- **Associations** : `/associations/...` (`modules/associations`).
- **Admin** (sous `/admin`) : pages + formulaires dans `routes/admin.rs` ; actions lourdes (`fetch_cards`, reload cache, YGOrg, complément archétype) dans **`modules/admin_sync`** (voir `app.rs`).
- **Images** : import / liste / fichiers (`routes/` + `images/`).
- **API documentée** : scope `/api` si JWT / clé API (voir `docs/auth.md`).

Détail structure backend : **`docs/reorganisation-backend-compte-rendu.md`**. Liste exacte des services : **`src/app.rs`**.

## Variables d’environnement

Référence commentée : **`.env.example`**. Points notables :

- `DATABASE_URL` — active Postgres + migrations au démarrage ; sinon mode fichier/cache selon config.
- `CARDS_PATH` — fallback fichier cartes.
- `STORAGE_BACKEND`, `LOCAL_STORAGE_PATH` — images.
- `ADMIN_SECRET`, `SESSION_SECRET`, `JWT_SECRET` — sécurité (voir commentaires dans `src/main.rs`).

Docker Compose charge `.env` pour user/mot de passe Postgres et pgAdmin.

## Workflow local

| Commande | Rôle |
|----------|------|
| `make dev` | Build front (`npm run build` dans `static/`) puis `cargo run` |
| `make watch` | Idem + `cargo watch` |
| `make test` | Tests Rust |
| `make test-frontend` | Vitest dans `static/` |
| `make docker-up` | Stack complète (build image app) |
| `make docker-dev` | Compose + `Dockerfile.dev` + volume + `cargo watch` |

**WSL** : le `Makefile` impose que `npm` ne soit **pas** celui de Windows (`/mnt/c/...`), sinon les scripts passent par CMD.EXE et les chemins UNC cassent Vite. Utiliser Node/npm installés **dans** la distro WSL.

## Tests

- **Rust** : `cargo test` (+ intégration HTTP dans `tests/`).
- **Front** : `cd static && npm run test:frontend` (Vitest + jsdom).
- **E2E** : Playwright sous `static/` (config `playwright.config.ts`).

## Documentation déjà présente

| Fichier | Contenu |
|---------|---------|
| `docs/auth.md` | Auth session / JWT / admin |
| `docs/db_schema.md` | Modèle données (pointer vers migrations récentes si divergent) |
| `docs/pipeline_images.md` | Images |
| `docs/decisions.md` | Décisions d’architecture |
| `docs/reorganisation-backend-compte-rendu.md` | Découpage `modules/` + `db/` (état réel) |
| `docs/migration_plan.md` | Migration / évolution (slices historiques) |
| `theory/yugioh-frontend-migration-plan.md` | Plan UI front |

## Règles d’équipe (Cursor / qualité)

- **Slices** : périmètre isolé + tests + entrée dans `docs/decisions.md` pour changements structurants.
- **Rust** : fmt, clippy, erreurs explicites ; préférer types forts aux `Value` partout.
- **Front (migration)** : conventions dans `.cursor/rules/migration.mdc` — tokens CSS dans `theory/tokens.css` / `static/css/tokens.css`, sélecteurs JS sur `data-*`, pas de refactor backend imposé par la règle migration sans demande explicite.

---

*Dernière mise à jour : aligné sur la réorganisation backend (`modules/`, `db/`). En cas d’écart avec le code, le code et les migrations font foi.*
