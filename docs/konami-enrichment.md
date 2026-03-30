# Données Konami (site officiel)

## Intérêt par rapport à YGOProDeck

L’**API YGOProDeck** (`sync-cards` / `fetch_cards`) reste la source **stable** pour remplir `cards` et `card_sets` (JSON typé, retries).

Le site **Konami** (`db.yugioh-card.com`) apporte surtout :

- la **vision officielle** des **listes par pack / produit** (navigation « catalogue ») ;
- des libellés **par locale** alignés sur l’éditeur ;
- une structure que l’ancien scraper Python suivait pack par pack.

Le HTML peut **changer sans préavis** : toute logique Konami doit être **isolée**, **versionnée**, et faire **échouer le job** si le parse ne matche plus (plutôt que d’écrire des données silencieusement fausses).

## Ce qui est en place aujourd’hui

| Élément | Rôle |
|---------|------|
| Table **`konami_catalog_snapshots`** | Stocke des **snapshots JSON** (clé `snapshot_key`, `kind`, `locale`, `source_url`, `payload`, `fetched_at`). |
| Sous-commande **`konami-pack-index`** | GET la page liste des packs, parse `div.pack` + `input.link_value` (même idée que le script Python), upsert **`pack_index:{locale}`**. |
| Table **`card_locales`** | Traductions par `(card_id, locale)` ; alimentée aussi par YGOProDeck (`sync-locales-ygo`). |
| Sous-commande **`sync-locales-konami`** | Parcourt les packs du snapshot, pages liste + fiche carte → upsert **`card_locales`** avec `source = konami_official` (limites via `KONAMI_LOCALE_SYNC_MAX_*`, délai `KONAMI_REQUEST_DELAY_MS`). |
| Env **`KONAMI_LOCALE`** | Défaut `en`. |

Exemple job cloud (même image que l’app) :

```bash
DATABASE_URL='postgres://…' KONAMI_LOCALE=fr ./analyzer-yugioh konami-pack-index
```

## Évolutions possibles (sans tout refaire en un bloc)

1. **Snapshots intermédiaires** `pack_cards:{locale}:…` si tu veux historiser les listes par produit sans repasser par tout le crawl.
2. **Métadonnées « wiki-like »** : plutôt que rescraper Fandom/Yugipedia dans ce repo, réutiliser le pipeline **YGOrg** / `card_enrichment_layers` quand c’est pertinent.
3. **Conserver temporairement** `yugioh_cardlist_scraper/` comme référence de sélecteurs CSS jusqu’à couverture Rust, puis supprimer le dossier.

*(Le crawl pack → fiches avec liaison **passcode** est déjà couvert par `sync-locales-konami` → `card_locales`.)*

## Légal / exploitation

Respecter les **conditions d’usage** du site Konami, limiter la **fréquence** des requêtes (jobs planifiés, pas de boucle serrée), et **ne pas** redistribuer de dumps complets si la licence du site l’interdit.
