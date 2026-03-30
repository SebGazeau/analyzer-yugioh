# Compte rendu — réorganisation des dossiers et fichiers (backend Rust)

Référence croisée : [`decisions.md`](./decisions.md), [`sync-pipeline-jobs.md`](./sync-pipeline-jobs.md).

## 1. Problème de départ

- **`src/handlers.rs`** : trop de responsabilités mélangées (pages, catalogue, auth site, decks, admin, associations).
- **`src/db.rs`** : fichier unique trop gros (cartes, locales, Konami, YGOrg, decks, etc.).

**Choix de principe** : découpage **vertical par domaine** (proche d’un style Nest), avec **slices** : changements radicaux à l’intérieur du périmètre, **contrats HTTP et API publique `db` stabilisés** autant que possible pendant la migration.

## 2. Ce qui a été décidé

| Thème | Décision |
|--------|-----------|
| Routes HTTP | Regrouper par feature sous **`src/modules/<domaine>/`** avec `routes.rs` (+ `helper.rs` / `repository.rs` quand utile). |
| Ancien `handlers.rs` | **Supprimé** ; le câblage Actix passe par **`src/app.rs`** → `crate::modules::…`. |
| Constante cartes fichier | **`CARDS_PATH_DEFAULT`** dans **`src/modules/mod.rs`**, réexportée depuis **`lib.rs`**. |
| Erreurs Tera HTML | **`src/modules/template_error.rs`** partagé (ex. pages + auth site). |
| Base de données | **`src/db/`** en plusieurs fichiers + **`db/mod.rs`** qui réexporte l’API publique. |
| Persistance « feature » | **`src/modules/<domaine>/repository.rs`** pour le SQL **propre au domaine** ; **`crate::db`** garde le SQL **partagé** (sync, Konami, écriture locales, cartes globales) pour éviter les cycles et les duplications. |
| Sync cartes / Cloud Job | **Cible** décrite dans **`docs/sync-pipeline-jobs.md`** : binaire **`job`** + futur **`sync::pipeline`** ; **pas** de gros `admin_sync/repository` — l’admin HTTP sert surtout à **déclencher** (prod) ou au dev. |

## 3. Ce qui a été fait (état réalisé)

### 3.1 Étape 2 — Modules HTTP (`src/modules/`)

- **`pages/`** : page d’accueil (`/`).
- **`catalog/`** : recherche, fiche par nom, compteur, validation deck.
- **`associations/`** : catalogue enrichi + Q&A related.
- **`admin_sync/`** : fetch cartes, reload cache, enrich YGOrg (comportement inchangé, emplacement changé).
- **`site_auth/`** : `register/`, `login/`, `logout/` (sous-dossiers avec `routes.rs`).
- **`decks/`** : CRUD decks + helper d’entrées.
- **`template_error.rs`**, **`modules/mod.rs`** avec **`CARDS_PATH_DEFAULT`**.

**Fichiers clés** : `src/lib.rs` (plus de `pub mod handlers`), `src/main.rs` (import `CARDS_PATH_DEFAULT`), `src/app.rs` (enregistrement des services via `crate::modules::…`).

### 3.2 Étape 3.1 — Dossier `src/db/`

Remplacement de **`db.rs`** monolithique par :

| Fichier | Rôle |
|---------|------|
| `error.rs` | `DbError` |
| `migrate.rs` | `run_migrations` |
| `konami.rs` | snapshots catalogue Konami |
| `card_locales.rs` | **écriture** uniquement : `CardLocaleUpsertRow`, `upsert_card_locales` |
| `cards.rs` | table `cards`, chargement cache, upserts YGOProDeck / sets, URLs images |
| `ygorg.rs` | enrichissement / sync YGOrg côté **db** (sans les lectures « associations » déplacées plus tard) |
| `mod.rs` | réexports publics |

### 3.3 Étape 3.2 — Repositories par feature (slices livrées)

| Module | Fichier | Contenu déplacé hors `db` |
|--------|---------|---------------------------|
| **decks** | `repository.rs` | `decks` / `deck_entries` (types + CRUD) — **plus** d’exports deck dans `db`. |
| **associations** | `repository.rs` | Champs catalogue EN YGOrg + `ygorg_internal_id_for_our_card` + `list_our_card_ids_sharing_ygorg_qa_with`. **`upsert_ygorg_qa_entry`** reste dans **`db/ygorg`** (job / `ygorganization.rs`). |
| **catalog** | `repository.rs` | Lecture / recherche **`card_locales`** (`card_ids_matching_locale_search`, `fetch_card_locales_map`, `find_card_id_by_locale_name`). **`upsert_card_locales`** reste dans **`db/card_locales`**. |

**Tests** : `tests/db_schema_live.rs` importe les fonctions déplacées depuis **`analyzer_yugioh::modules::associations`** et **`analyzer_yugioh::modules::catalog`**.

### 3.4 Documentation

- **`docs/decisions.md`** : historique étapes 2, 3.1, 3.2 + décision **Sync Cloud Job**.
- **`docs/sync-pipeline-jobs.md`** : cible **`main` / binaire job / admin**, arborescence souhaitée `src/sync/` + `src/bin/sync_cards.rs`, diagramme, invariants (à implémenter progressivement).

## 4. Vue synthétique « qui vit où » aujourd’hui

- **`crate::modules::…`** : HTTP + helpers + **repositories** decks / associations / catalog (parties migrées).
- **`crate::db::…`** : migrations, erreur SQL, **cartes**, **YGOrg (sync + upsert QA, etc.)**, **Konami**, **upsert `card_locales`**, constantes `YGORG_*`.
- **Non démarré dans le code** (seulement figé dans la doc) : dossier **`src/sync/`**, binaire **`sync_cards`**, amincissement des routes **`admin_sync`** vers « trigger job ».

## 5. Ce qui n’a pas été refondu (hors périmètre de ces slices)

- **`src/auth/`**, **`src/routes/`** (admin API, images, etc.), **`static/`**, templates : inchangés dans cette réorganisation.
- Pas de déplacement de **`cards_sync.rs`** / **`ygorganization.rs`** vers `src/sync/` : prévu comme **prochaine évolution** alignée sur **`sync-pipeline-jobs.md`**.

## 6. Pistes de validation

- `cargo fmt`, `cargo clippy`, `cargo test`.
- Tests DB live ignorés : `TEST_DATABASE_URL=… cargo test db_live -- --ignored` (ou `make test-db`).

---

**En résumé** : le projet est passé d’un **gros `handlers.rs` + un gros `db.rs`** à une structure **`modules/` par domaine** et **`db/` découpé**, avec **repositories** pour decks, associations et catalogue (lecture locales), la **sync lourde** encore centralisée dans **`db` + modules existants**, et une **cible Cloud Job** formalisée dans la doc pour la suite.

---

## 7. Intégration avec le travail `main` (pré-réorganisation), sans réintroduire `handlers` / `db.rs`

Quand la réorganisation a démarré sur `dev`, une partie du travail restait sur `main` (souvent non commitée) : **complément d’archétype** (`card_metadata_fill`), **colonnes / API** `archetype_source`, **admin** `preview` / `apply`, **front** associations / recherche, **scripts** d’enrichissement, etc.

**Règle** : on garde **à la fois** la structure cible (§3) **et** ces fonctionnalités, en les **rebranchant** sur les bons emplacements :

| Ancien emplacement (`main`) | Emplacement cible (post-réorg) |
|-----------------------------|----------------------------------|
| Handlers admin fetch / enrich / preview / apply | **`src/modules/admin_sync/routes.rs`** (une seule fois chaque route ; **`src/app.rs`** n’enregistre **pas** de module `handlers` inexistant). |
| SQL candidats / update `archetype` + `archetype_source` dans l’ancien `db.rs` | **`src/db/cards.rs`** + réexports dans **`src/db/mod.rs`** (API SQL partagée carte, alignée §3.2). |
| `pub mod card_metadata_fill` | **`src/lib.rs`** inchangé côté intention : le module reste à la racine `src/`, appelé par **`admin_sync`**. |
| Cache `load_all_cards` avec `archetype_source` | Colonne dans le **`SELECT`** de **`db/cards.rs`** et champ dans **`CardRow`** → **`RawCardSearchResult`**. |

En cas de merge Git « les deux côtés » : **ne pas** dupliquer les `.service(...)` dans **`app.rs`** (un seul jeu : `crate::modules::admin_sync::…`). Les conflits « both » sur le code HTTP doivent être résolus en **fusionnant le comportement** dans **`modules/*/routes.rs`**, pas en réimportant `handlers.rs`.
