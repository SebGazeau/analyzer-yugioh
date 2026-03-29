# Pipeline d’enrichissement des cartes (YGOProDeck + YGOrganization)

Objectif : **compléter** les données sans **remplacer** le cœur importé dans `cards` (noms, type, desc, images, banlist, etc.). Les colonnes actuelles restent la vérité opérationnelle du builder/recherche ; le reste vit en tables dédiées ou en JSONB.

## État actuel

- Import bulk : **`GET https://db.ygoprodeck.com/api/v7/cardinfo.php`** → `upsert_cards` → table **`cards`** uniquement.
- Tables **`card_sets`** et **`card_prices`** : présentes au schéma (**MPD v4**) mais **jamais alimentées** par le code Rust aujourd’hui.
- Nouvelle table **`card_enrichment_layers`** (migration `20260321120000_card_enrichment_layers.sql`) :
  - Clé `(card_id, source, layer)` — ex. `source = 'ygorganization'`, `layer = 'card_raw'`.
  - **`payload` JSONB** + `fetched_at` pour traçabilité et invalidation.

## Étape 1 — Script / job « YGOProDeck enrichi »

**But** : exploiter ce que `cardinfo.php` renvoie déjà en plus du noyau.

### Fait : `card_sets` (sans prix)

- `ApiCard` parse `card_sets[]` (`ygo_api.rs`) ; `ApiCard::card_set_rows()` → `CardSetUpsertRow`.
- Si `set_rarity_code` est vide, clé dérivée `::` + slug de `set_rarity` pour éviter les collisions de PK `(card_id, set_code, rarity_code)`.
- **`set_price`** : non rempli (NULL) — hors périmètre prix pour l’instant.
- Après `upsert_cards`, **`GET /admin/fetch_cards`** appelle `db::upsert_card_sets` (transactions par paquets de 400).
- Conflit : mise à jour `set_name` et `rarity` ; `set_price` existant non écrasé.

### Pas fait (plus tard)

- `card_prices` (table marketplace) — volontairement ignoré.
- `misc_info` / autres champs JSON dans `card_enrichment_layers` si besoin.

## Étape 2 — YGOrganization

**But** : récupérer les JSON par **ID Konami** (alignés avec `cards.id` YGOProDeck dans la pratique).

**Fait (code)** :

- Module **`src/ygorganization.rs`** : client `reqwest` vers **`https://db.ygoresources.com`**.
- **IDs** : l’ID dans `/data/card/{id}` est l’**ID interne YGResources**, pas le passcode YGOProDeck (`cards.id`). Résolution : copie locale de **`GET /data/idx/card/name/en`** (table **`ygorg_en_name_index`**, alimentée par **`mode=sync_index`** — téléchargement volumineux, timeout long).
- Tables : **`external_api_cache_state`** (révision), **`card_ygorg_id_map`** (notre `card_id` → `ygorg_internal_id`), **`card_ygorg_unresolved`** (nom introuvable dans l’index ; évite boucles backfill ; effacé à chaque `sync_index`).
- **`GET /admin/enrich_ygorganization`** :
  - **`mode=sync_index`** : recharge l’index nom EN → id (TRUNCATE + insert).
  - **`mode=init`** : sonde `GET /data/card/10000`, enregistre `X-Cache-Revision`.
  - **`mode=backfill&max=N`** : pour chaque carte sans `card_raw`, lookup nom (`name_en` si non vide sinon `name`, **égalité exacte** avec l’index) → `ygorg_internal_id` → fetch JSON → `card_enrichment_layers` + `card_ygorg_id_map`.
- **Dérivation `archetype`** (`apply_card_metadata_fill`) : en plus de la 1ʳᵉ ligne d’`effectText`, analyse des **lignes suivantes** (plafond 15) pour les motifs `"…" monster` ; citations de plus de **5 mots** ignorées (évite les noms de carte longs).
  - **`mode=manifest&max=N`** : ids du manifest = ids YGResources ; on ne met à jour que les cartes déjà présentes dans **`card_ygorg_id_map`** (souvent après backfill).
  - **`mode=sync_qa&max=N`** : liste **`GET /data/meta/recent/en/qa`**, puis pour chaque id **`GET /data/qa/{id}`** → table **`ygorg_qa_entries`** (ids `cards` = YGOrg internes).
- Débit : ~120 ms entre chaque `GET /data/card/…`.

**Limites** : noms YGOProDeck ≠ clés de l’index EN → `card_ygorg_unresolved` ; homonymes → plus petit `ygorg_internal_id` pris ; pas de fuzzy match.

**Non fait / plus tard** : retries, file persistante, normalisation Unicode des noms, consommation dans `load_all_cards` / DTO.

**Règle produit** : ne pas écraser `cards.name` / `card_desc` depuis ce flux.

## Étape 3 — Consommation côté app

- **Recherche / cache** : `load_all_cards` charge **`archetype`** et **`archetype_source`** depuis `cards` (colonne matérialisée par le job admin `apply_card_metadata_fill`). `GET /search` sérialise `archetype_source` si présent. Les enrichissements JSONB YGOrg hors colonnes restent accessibles via jointures dédiées (ex. catalogue associations).
- **Cartes associées** : `GET /associations/catalog` joint les champs EN YGOrg (`effectText`, `pendulumEffect`, `flavorText`, `linkEffect`, `name`), expose **`archetype_source`** avec **`archetype`**, et **`image_url`** : WebP **`/images/{uuid}/file/mobile`** si l’illustration est en base, sinon URL YGOProDeck du cache (pour la modal avec vignettes). **`GET /associations/qa_related?card_id=`** renvoie les ids catalogue partageant une Q&A avec l’ancre (nécessite **`sync_qa`** + **`card_ygorg_id_map`**). Le groupe « citation nom ancre » utilise **`associationCitableTextForAnchorNameMatch`** (sans `ygorg_name_en`) pour limiter les faux positifs. Côté client, le catalogue et `qa_related` sont mis en cache en session (`static/js/associations/associationFetchCache.ts`) ; index partiel DB **`idx_card_enrichment_ygorg_card_raw`** sur `card_enrichment_layers` pour le scan `ygorganization` / `card_raw`.

## Job planifié (coût maîtrisé)

Orchestration par **script shell** + petits `max` + pauses : [enrichment-job.md](./enrichment-job.md). Service Docker optionnel : `docker-compose.enrich-job.yml` (profil `enrich`).

## Ordre de travail recommandé

| # | Tâche | Livrable |
|---|--------|----------|
| 1 | Migration `card_enrichment_layers` | ✅ SQL |
| 2 | Parser `card_sets` depuis `cardinfo` + upsert SQL | ✅ `upsert_card_sets` + tests `ygo_api` |
| 3 | (Option) `card_prices` ou job séparé | reporté |
| 4 | Client manifest + fetch YGOOrganization → `card_enrichment_layers` | ✅ `ygorganization.rs` + `/admin/enrich_ygorganization` |
| 5 | (Option) Vue SQL ou DTO enrichi pour le front | hors scope immédiat |

## Références

- YGOProDeck API : `https://ygoprodeck.com/api-guide`
- YGOrganization API : `https://db.ygorganization.com/about/api`
