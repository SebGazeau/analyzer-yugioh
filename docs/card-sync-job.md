# Job cloud : synchronisation des cartes (`sync-cards`)

## Rôle

La sous-commande **`./analyzer-yugioh sync-cards`** remplit / met à jour les tables **`cards`** et **`card_sets`** via l’**API JSON officielle** YGOProDeck (`cardinfo.php` v7), sans scraping HTML. C’est la même logique que **`GET /fetch_cards`** quand une base Postgres est configurée, mais **sans serveur HTTP** ni cache mémoire : adaptée aux **Cloud Run Jobs**, **Cloud Scheduler** (cron) ou tout conteneur « one-shot ».

## Robustesse vs ancien dossier Python

Le dépôt **`yugioh_cardlist_scraper/`** s’appuie sur plusieurs sites en HTML (fragile). Ici, seule l’**API structurée** est utilisée ; les erreurs réseau déclenchent des **reprises** (plusieurs tentatives, backoff). Pour des métadonnées type « supports / anti-supports » uniquement présentes sur les wikis, il faudrait un **pipeline d’enrichissement** séparé (ex. tables `card_enrichment_*` / YGOrg), pas un gros scraper monolithique.

## Variables d’environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | oui | Postgres (même format que l’app, ex. socket Cloud SQL) |
| `YGOPRODECK_CARDINFO_URL` | non | URL `cardinfo` (défaut : `https://db.ygoprodeck.com/api/v7/cardinfo.php`) |
| `RUST_LOG` | non | ex. `info` pour des logs utiles |

Les secrets **ADMIN** / **SESSION** ne sont **pas** requis pour `sync-cards` (pas de mode `APP_ENV=production` imposé par cette commande).

## Comportement

1. Connexion Postgres, **migrations** embarquées (comme au boot ; en cas d’échec : warning puis poursuite — aligné sur le serveur).
2. Téléchargement JSON, parse typé (`serde`), **upsert** batch `cards` puis `card_sets`.
3. **Code de sortie** : `0` si succès, non nul si erreur (adapté aux jobs).

## Google Cloud (exemple)

- **Cloud Run Job** : même image que le service web ; **commande** : `analyzer-yugioh` (ou chemin absolu dans l’image), **arguments** : `sync-cards`. Injecter **`DATABASE_URL`** (Secret Manager → env). Région identique à Cloud SQL si socket Unix.
- **Cloud Scheduler** : déclencher le job sur un planning cron (ex. quotidien).
- Enchaînement possible : Job 1 `migrate`, Job 2 `sync-cards`, ou une seule tâche `sync-cards` si les migrations sont déjà appliquées au démarrage du service.

Voir aussi **`docs/deploy-gcp-cloudsql.md`** pour le format `DATABASE_URL` avec `/cloudsql/…`.

## Local

```bash
DATABASE_URL='postgres://…' cargo run -- sync-cards
```

## Voir aussi

- **Catalogue Konami (HTML)** : `konami-pack-index` et table `konami_catalog_snapshots` — **`docs/konami-enrichment.md`**.

## Suite possible

- Retirer **`yugioh_cardlist_scraper/`** du monorepo une fois les besoins couverts par DB + enrichissements.
- Activer **Artifact Analysis** sur l’image (todo projet).
