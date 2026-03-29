# Décisions d’architecture

**Synthèse réorganisation backend (handlers, `db`, `modules`, repositories)** : [`reorganisation-backend-compte-rendu.md`](./reorganisation-backend-compte-rendu.md).

## 2026-03-28 — Modules métier (`src/modules/`)

**Contexte** : `handlers.rs` et `db.rs` concentraient trop de responsabilités ; besoin d’un découpage vertical (style Nest) avec `helper` / `provider` / `routes` par domaine.

**Décision** :

- Introduire `src/modules/` pour les périmètres métier.
- **Étape 2 (terminée)** : routes HTTP déplacées depuis l’ancien `handlers.rs` vers `modules/<domaine>/routes.rs` (`pages`, `catalog`, `associations`, `admin_sync`, `site_auth`, `decks`), `template_error` + `CARDS_PATH_DEFAULT` dans `modules/mod.rs`.
- **Étape 3.1 (terminée)** : `db` sous `src/db/` par fichier domaine ; voir 3.2 pour ce qui a migré vers `modules/*/repository.rs`.
- **Étape 3.2 (en cours)** : persistance par feature dans `modules/<domaine>/repository.rs` ; `DbError` et le SQL partagé (sync YGOrg, `cards`, Konami, upsert `card_locales`) restent dans `crate::db`.
  - **Slices livrées** : `decks/repository`, `associations/repository` (lecture YGOrg pour `/associations/*` + Q&A related ; `upsert_ygorg_qa_entry` reste dans `db` pour `ygorganization.rs`), `catalog/repository` (recherche / lecture `card_locales` ; `upsert_card_locales` reste dans `db` pour Konami / jobs).
  - **Reste typique dans `db`** : `cards`, `ygorg` (sync / enrichissement), `konami`, écriture `card_locales`, migrations. L’orchestration sync côté job : voir **[`sync-pipeline-jobs.md`](./sync-pipeline-jobs.md)** (pas d’`admin_sync/repository` pour le gros sync).

**Modules livrés** : `decks`, `pages`, `catalog`, `associations`, `admin_sync`, `site_auth` — contrats HTTP inchangés.

**Pourquoi** : lisibilité, ownership par feature, tests de non-régression par slice.

---

## 2026-03-28 — Sync cartes (Cloud Job vs serveur HTTP)

**Contexte** : la récupération des cartes et enrichissements externes ne doit pas rester le chemin principal du serveur HTTP en production ; un **job** (ex. Cloud Run Job) doit orchestrer le pipeline.

**Décision** :

- **Cible** documentée dans **[`docs/sync-pipeline-jobs.md`](./sync-pipeline-jobs.md)** (structure fichiers, flux `main` / `bin/sync_cards` / `admin_sync`, invariants, mermaid).
- **Pas** d’`admin_sync/repository` dédié pour « posséder » le sync : la logique commune vit dans un module **`sync::pipeline`** (ou nom équivalent), appelé par le **binaire job** ; les routes admin ne font qu’**orchestrer un déclenchement** (prod) ou déléguer au pipeline (dev).
- Le crate **`db`** (et modules existants `cards_sync`, `ygorganization`) restent les briques bas niveau ; le pipeline les enchaîne sans dupliquer le SQL dans les handlers.

**Pourquoi** : une seule source de vérité pour l’ordre des étapes de sync, alignement prod avec Cloud Job, serveur HTTP focalisé sur le trafic et le cache.
