# Migrations PostgreSQL

## Comportement par défaut

Au démarrage, si `DATABASE_URL` est valide, l’app appelle `db::run_migrations` (SQL embarqué via `sqlx::migrate!`). En cas d’échec, un **warning** est loggé et l’app peut continuer sans pool (comportement historique). Pour la prod, vérifier les logs au premier déploiement.

## Appliquer les migrations sans lancer le serveur

Même binaire que l’application (image Docker / release) :

```bash
export DATABASE_URL='postgres://…'
./analyzer-yugioh migrate
```

- Sortie **0** si OK, **≠ 0** si erreur (adapté aux jobs CI / Cloud Run).

Depuis le dépôt :

```bash
make db-migrate
# ou
./scripts/db_migrate.sh
```

(`scripts/db_migrate.sh` charge `.env` si présent, puis `target/release/analyzer-yugioh migrate`, sinon `cargo run -- migrate`.)

## Tests

| Commande | Rôle |
|----------|------|
| `cargo test` | Inclut `tests/migrations_consistency.rs` (ordre / unicité des fichiers + présence des objets YGOrg dans le SQL). **Sans Postgres.** |
| `make test-db` | Tests `db_live*` dans `tests/db_schema_live.rs` : migrations idempotentes, tables + index attendus, requête Q&A `list_our_card_ids_sharing_ygorg_qa_with`. **Nécessite `TEST_DATABASE_URL`.** |

Exemple local (docker compose, port hôte **5433**) :

```bash
export TEST_DATABASE_URL='postgres://analyzer:analyzer@127.0.0.1:5433/analyzer_yugioh'
make test-db
```

En CI : démarrer un service Postgres, définir `TEST_DATABASE_URL`, puis `cargo test db_live -- --ignored`.

## Déploiement « en ligne »

1. **Option A (simple)** : laisser le conteneur démarrer l’app ; les migrations s’appliquent au boot.
2. **Option B (recommandé si tu veux échouer avant le trafic)** : job / étape déploiement qui exécute la même image avec la commande `migrate`, puis déploiement du service qui écoute le port.

Sur Cloud Run, tu peux lancer une révision one-shot avec `--command` pointant vers `migrate` (voir `deploy-gcp-cloud-run.md`).

## Quand ajouter des assertions

- Nouvelle migration `.sql` : mettre à jour `REQUIRED_TABLES` / `REQUIRED_INDEXES` dans `tests/db_schema_live.rs` si tu ajoutes des objets **contrat** pour l’app ou les associations.
- Objets YGOrg / associations : mettre à jour aussi la liste dans `tests/migrations_consistency.rs` (`migrations_define_expected_ygorg_objects`) pour garder une trace dans le dépôt sans DB.
