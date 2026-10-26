# CI : tests d’intégration (Postgres + E2E)

Le workflow réutilisable **`.github/workflows/integration-reusable.yml`** est exécuté :

- sur chaque **PR** (après **Quality**), en parallèle du smoke Docker ;
- avant le **déploiement GCP** (après **Quality** sur tag `v*`).

## Ce qui est lancé

1. **PostgreSQL 16** (service conteneur sur le runner GitHub), utilisateur / base **`analyzer` / `analyzer_yugioh`** — aligné avec l’exemple **Cloud SQL Postgres 16** de **`deploy-gcp-cloudsql.md`** (même famille de version que la prod, pas le proxy Unix `/cloudsql/...` du runner).
2. **`./target/debug/analyzer-yugioh migrate`** — même commande que **`scripts/db_migrate.sh`** / image release (voir **`docs/db-migrations.md`**).
3. **`cargo test db_live -- --ignored`** — contrat schéma, index, requêtes YGOrg Q&A.
4. Build front **`static/dist`**, démarrage de l’app en **mode non-prod** (pas de `APP_ENV=production` : pas besoin des secrets longs imposés en prod, cf. **`deploy-security-prod.md`**).
5. **Playwright** (Chromium) contre `http://127.0.0.1:8080`, specs dans **`static/e2e/`**.

En cas d’échec, des **artefacts** (rapport Playwright, log app) sont conservés quelques jours.

## Recommandations **génériques**

- Base **jetable** par job : identifiants en clair dans le workflow vont bien pour la CI, **pas** pour la prod (prod : Secret Manager, pas de mot de passe dans les logs).
- **Migrations avant** les tests qui supposent le schéma — comme un job **`migrate`** optionnel avant de router le trafic vers une nouvelle révision Cloud Run.
- **Échec = pas de merge / pas de déploiement** : le job **Deploy** dépend de **integration**.

## Alignement **Google Cloud** (rappels)

- **Tester avant de déployer** : parcours décrit dans l’architecture CI/CD GCP ([CI/CD sur Google Cloud](https://cloud.google.com/architecture/best-practices-for-cicd)) — nos jobs *Quality* + *Integration* matérialisent cette couche avant Cloud Run.
- **Même moteur Postgres majeur qu’en prod** (ici **16**) pour limiter les écarts avec **Cloud SQL** ([versions PostgreSQL](https://cloud.google.com/sql/docs/postgres/db-versions)).
- **Sécurité des images** : après push vers **Artifact Registry**, activer / consulter **Artifact Analysis** (scan de vulnérabilités) — voir [Artifact Analysis](https://cloud.google.com/artifact-analysis/docs) ; en prod, politiques du type **Binary Authorization** restent du côté organisation GCP.
- **Identité** : le déploiement utilise déjà la **Workload Identity Federation** (pas de clé JSON longue durée) — cf. **`deploy-gcp-cloud-run.md`**.

## Local

- DB live : `TEST_DATABASE_URL=... cargo test db_live -- --ignored` ou `make test-db`.
- E2E : depuis `static/`, `npm run test:e2e` (l’app est lancée par Playwright si **`BASE_URL`** est absent).
