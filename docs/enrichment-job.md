# Job d’enrichissement (YGOrg + dérivation archétype)

Objectif : **avancer le remplissage** de `card_enrichment_layers`, du map YGOrg et des colonnes `archetype` / `archetype_source` **sans pic réseau** ni **gros batch** en une fois, en réutilisant les routes admin existantes.

## Principe

- Chaque exécution traite **au plus** `N` cartes par étape (`max` côté API), avec **pauses** configurables entre les appels.
- **`sync_index`** (téléchargement de l’index nom EN → id YGResources) est **désactivé par défaut** : à lancer **rarement** (ex. après une grosse mise à jour YGOrg), pas en cron horaire.
- **`apply_card_metadata_fill`** : par défaut le job est en **simulation** (`write` absent). Pour écrire en base : `ENRICH_METADATA_FILL_WRITE=1`.

## Coût / risques maîtrisés

| Levier | Effet |
|--------|--------|
| Petits `ENRICH_*_MAX` | Limite appels distants YGOrg et charge DB par run |
| `ENRICH_SLEEP_BETWEEN_STEPS_SEC` | Espace les requêtes ; s’aligne sur le débit déjà documenté (~120 ms entre `GET /data/card/…` côté Rust) |
| Pas de `sync_index` en routine | Évite le téléchargement massif et le TRUNCATE index à chaque cron |
| Cron 1× / jour (ou semaine) | Coût API / CPU prévisible ; pas de tempête au clic utilisateur |
| `ENRICH_METADATA_FILL_WRITE=0` | Zéro écriture `cards` (dry-run) |

## Exécution locale (hôte)

Prérequis : l’app écoute sur `ENRICHMENT_BASE_URL`, Postgres à jour, migrations appliquées.

```bash
# Charger ADMIN_SECRET comme dans .env si la route admin est protégée
set -a && [ -f .env ] && . ./.env && set +a
export ENRICHMENT_BASE_URL="${ENRICHMENT_BASE_URL:-http://localhost:8080}"
chmod +x scripts/enrichment_job.sh
./scripts/enrichment_job.sh
```

Écriture réelle des archétypes dérivés :

```bash
export ENRICH_METADATA_FILL_WRITE=1
./scripts/enrichment_job.sh
```

## Make

```bash
make enrichment-job
```

Cible définie dans le `Makefile` : charge `.env`, exécute `scripts/enrichment_job.sh`.

## Docker (profil `enrich`)

Service optionnel qui enchaîne des passes toutes les `ENRICH_INTERVAL_SEC` secondes (défaut **3600** dans le compose — 1 h ; surchargeable).

```bash
docker compose -f docker-compose.yml -f docker-compose.enrich-job.yml --profile enrich up -d enrichment-job
```

Variables d’environnement : mêmes noms que le script ; dans le fichier compose, `ENRICHMENT_BASE_URL=http://app:8080`.

## Variables (référence)

| Variable | Défaut | Rôle |
|----------|--------|------|
| `ENRICHMENT_BASE_URL` | `http://localhost:8080` | Base de l’API |
| `ADMIN_SECRET` | vide | Header `X-Admin-Key` si l’app impose une clé |
| `ENRICH_RUN_SYNC_INDEX` | `0` | `1` = exécuter `mode=sync_index` (lourd) |
| `ENRICH_RUN_INIT` | `1` | Sonde révision YGOrg (`mode=init`) |
| `ENRICH_BACKFILL_MAX` | `25` | `backfill` |
| `ENRICH_MANIFEST_MAX` | `25` | `manifest` |
| `ENRICH_SYNC_QA_MAX` | `50` | `sync_qa` |
| `ENRICH_METADATA_FILL_MAX` | `100` | `apply_card_metadata_fill` |
| `ENRICH_METADATA_FILL_WRITE` | `0` | `1` = écriture DB + reload cache |
| `ENRICH_SLEEP_BETWEEN_STEPS_SEC` | `3` | Pause entre étapes |
| `ENRICH_SLEEP_AFTER_INDEX_SEC` | `10` | Pause après `sync_index` si activé |
| `ENRICH_INTERVAL_SEC` | `0` | Si > 0 : boucle (service Docker) |

## Production / cloud

- **Cloud Scheduler** + **HTTP GET** : exposer une URL interne qui déclenche le même enchaînement (aujourd’hui il faut un petit proxy ou script, les routes sont sous `/admin` avec auth).
- **Cron sur VM** : `0 3 * * *` + `enrichment_job.sh` avec `.env` restreint.
- Ne pas augmenter les `max` tant que la facture YGOrg / la latence DB n’est pas mesurée.

## Voir aussi

- Pipeline détaillé : [enrichment-pipeline.md](./enrichment-pipeline.md)
- Champs par angle associations : [associations-data-by-angle.md](./associations-data-by-angle.md)
