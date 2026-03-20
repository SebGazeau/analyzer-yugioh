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
│   ├── main.rs          # Entrée, env, pool SQL, cache cartes
│   ├── lib.rs           # Exports + make_app pour tests
│   ├── app.rs           # Montage Actix (routes, static, session, admin, api)
│   ├── handlers.rs      # Pages HTML + JSON (search, decks, auth formulaires)
│   ├── routes/          # admin (fetch_cards…), images (import, serve)
│   ├── auth/            # jwt, session, api web, user_db, admin_db
│   ├── db.rs            # Migrations, chargement cartes depuis DB
│   ├── shared/          # Types deck, recherche, cache, enums Yu-Gi-Oh
│   ├── images/          # Pipeline fetch / traitement / repo
│   ├── storage/         # Abstraction local vs GCS
│   └── ygo_api.rs       # Client HTTP vers l’API cartes
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

Les handlers dans `src/handlers.rs` et `src/routes/` exposent notamment :

- **Pages** : `/`, recherche, builder, decks, analysis, register/login (selon montage dans `app.rs`).
- **JSON / API usage courant** : `/search`, `/card`, `POST /validate_deck`, CRUD decks (`/decks`, `/decks/{id}`).
- **Admin** (sous `/admin`, clé `X-Admin-Key` si `ADMIN_SECRET`) : dont `fetch_cards` pour remplir la DB.
- **Images** : import / liste / fichiers (si storage configuré).
- **API documentée** : scope sous `/api` quand secrets JWT / clé API sont présents (voir `docs/auth.md`).

La liste exacte et les middlewares : `src/app.rs`.

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
| `docs/migration_plan.md` | Migration / évolution |
| `theory/yugioh-frontend-migration-plan.md` | Plan UI front |

## Règles d’équipe (Cursor / qualité)

- **Slices** : périmètre isolé + tests + entrée dans `docs/decisions.md` pour changements structurants.
- **Rust** : fmt, clippy, erreurs explicites ; préférer types forts aux `Value` partout.
- **Front (migration)** : conventions dans `.cursor/rules/migration.mdc` — tokens CSS dans `theory/tokens.css` / `static/css/tokens.css`, sélecteurs JS sur `data-*`, pas de refactor backend imposé par la règle migration sans demande explicite.

---

*Dernière mise à jour : généré à partir de l’état du dépôt ; en cas d’écart avec le code, le code et les migrations font foi.*
