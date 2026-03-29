# Schéma base de données — MPD v3

Document de référence. Source de vérité : `migrations/20250203000002_mpd_v3.sql`.

---

## Périmètre actuel

- **ENUMs** : `card_type`, `card_attribute`, `card_frame`, `ban_status`.
- **Table `cards`** : catalogue des cartes (rempli par `GET /admin/fetch_cards`, protégé par X-Admin-Key).
- **Table `card_sets`** : éditions / sets (FK → `cards`).
- **Table `card_prices`** : prix par marketplace (FK → `cards`).

## Évolutions prévues

- **Utilisateurs** : table `users`.
- **Decks sauvegardés** : tables `decks`, `deck_entries` (FK → `users`, `cards`).

---

## 1. Types ENUM

| Type | Valeurs |
|------|--------|
| `card_type` | `'Monster'`, `'Spell'`, `'Trap'` |
| `card_attribute` | `'DARK'`, `'DIVINE'`, `'EARTH'`, `'FIRE'`, `'LIGHT'`, `'WATER'`, `'WIND'` |
| `card_frame` | `'normal'`, `'effect'`, `'ritual'`, `'fusion'`, `'synchro'`, `'xyz'`, `'link'`, `'token'`, `'spell'`, `'trap'`, `'skill'` |
| `ban_status` | `'Forbidden'`, `'Limited'`, `'Semi-Limited'` (NULL = non restreinte) |

---

## 2. Table `cards`

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | `BIGINT` | non | PK, identifiant API |
| `name` | `TEXT` | non | Nom de la carte |
| `name_en` | `TEXT` | oui | Nom anglais |
| `race` | `TEXT` | oui | Race / type |
| `level` | `SMALLINT` | oui | Niveau ou rang |
| `archetype` | `TEXT` | oui | Archétype |
| `archetype_source` | `TEXT` | oui | Provenance si complété hors YGOProDeck (ex. `ygorg_effect_en`, migration `20260327120000`) |
| `atk` | `INTEGER` | oui | ATK |
| `def` | `INTEGER` | oui | DEF |
| `ygoprodeck_url` | `TEXT` | oui | Lien YGOProDeck |
| `updated_at` | `TIMESTAMPTZ` | non | Dernière mise à jour |
| `type` | `card_type` | non | Monster / Spell / Trap |
| `attribute` | `card_attribute` | oui | Attribut monstre |
| `frame_type` | `card_frame` | oui | Sous-type affichage |
| `ban_tcg` | `ban_status` | oui | Liste TCG |
| `ban_ocg` | `ban_status` | oui | Liste OCG |
| `card_desc` | `TEXT` | non | Description (défaut `''`) |
| `human_type` | `TEXT` | oui | Libellé type humain |
| `image_url` | `TEXT` | oui | URL image |
| `image_url_small` | `TEXT` | oui | URL miniature |
| `image_url_cropped` | `TEXT` | oui | URL recadrée |

Index : `idx_cards_name_lower`, `idx_cards_type`, `idx_cards_frame_type`, `idx_cards_ban_tcg`, `idx_cards_archetype`.

---

## 2bis. Table `card_locales`

*(Migration `20260329120000_card_locales.sql`.)*  
Noms et textes par **locale** (complément à `cards`, qui reste la ligne canonique par passcode).  
Jobs : `sync-locales-ygo`, `sync-locales-konami` ; côté HTTP : `GET /search?q=…&locale=fr` (le front envoie la locale depuis `<html lang>`).

| Colonne | Type | Description |
|---------|------|-------------|
| `card_id` | `BIGINT` | PK (1/2), FK → `cards(id)` ON DELETE CASCADE |
| `locale` | `TEXT` | PK (2/2), ex. `fr`, `de`, `ja` |
| `name` | `TEXT` | Nom affiché |
| `card_desc` | `TEXT` | Description / effet |
| `source` | `TEXT` | ex. `ygoprodeck`, `konami_official` |
| `updated_at` | `TIMESTAMPTZ` | Dernière écriture |

Index : `idx_card_locales_locale`.

---

## 3. Table `card_sets`

Éditions / sets d’impression. PK : `(card_id, set_code, rarity_code)`. FK : `card_id` → `cards(id)` ON DELETE CASCADE.

| Colonne | Type | Description |
|---------|------|-------------|
| `card_id` | `BIGINT` | FK → cards |
| `set_code` | `TEXT` | Code set |
| `rarity_code` | `TEXT` | Code rareté (défaut `''`) |
| `set_name` | `TEXT` | Nom du set |
| `rarity` | `TEXT` | Rareté |
| `set_price` | `TEXT` | Prix set |

Index : `idx_card_sets_set_code`.

---

## 4. Table `card_prices`

Prix par marketplace. PK : `card_id`. FK : `card_id` → `cards(id)` ON DELETE CASCADE.

| Colonne | Type | Description |
|---------|------|-------------|
| `card_id` | `BIGINT` | PK, FK → cards |
| `tcgplayer_price` | `NUMERIC(10,2)` | Prix TCGPlayer |
| `cardmarket_price` | `NUMERIC(10,2)` | Prix Card Market |
| `ebay_price` | `NUMERIC(10,2)` | Prix eBay |
| `amazon_price` | `NUMERIC(10,2)` | Prix Amazon |
| `coolstuffinc_price` | `NUMERIC(10,2)` | Prix CoolStuffInc |
| `updated_at` | `TIMESTAMPTZ` | Dernière mise à jour |

---

## 5. Table `card_enrichment_layers`

*(Migration `20260321120000_card_enrichment_layers.sql`.)*  
Données **additives** par source externe (ex. YGOrganization), sans modifier les colonnes canoniques de `cards`.

| Colonne | Type | Description |
|---------|------|-------------|
| `card_id` | `BIGINT` | FK → `cards(id)` ON DELETE CASCADE |
| `source` | `TEXT` | Ex. `ygorganization`, `ygoprodeck_misc` |
| `layer` | `TEXT` | Sous-clé (défaut `default`) |
| `payload` | `JSONB` | Document JSON stocké tel quel ou normalisé |
| `fetched_at` | `TIMESTAMPTZ` | Dernier fetch |

PK : `(card_id, source, layer)`. Voir **`docs/enrichment-pipeline.md`**.

Index partiel **`idx_card_enrichment_ygorg_card_raw`** (`20260326000000_assoc_catalog_perf_indexes.sql`) : lignes `source = 'ygorganization'` et `layer = 'card_raw'` — accélère la requête catalogue associations (`ygorg_en_catalog_fields_by_card_id`).

---

## 6. Table `external_api_cache_state`

*(Migration `20260323183000_external_api_cache_state.sql`.)*  
Dernière **`X-Cache-Revision`** connue par source (API YGOrganization / YGResources), pour les requêtes **`/manifest/{rev}`** sans repartir de zéro.

| Colonne | Type | Description |
|---------|------|-------------|
| `source` | `TEXT` | PK — ex. `ygorganization` |
| `cache_revision` | `BIGINT` | Révision serveur à réutiliser pour le manifest |
| `updated_at` | `TIMESTAMPTZ` | Dernière mise à jour |

---

## 7. Tables YGOrganization (résolution nom → id)

*(Migration `20260324120000_ygorg_name_index.sql`.)*

### `ygorg_en_name_index`

Copie de **`/data/idx/card/name/en`** : nom EN exact → id interne YGResources.

| Colonne | Type | Description |
|---------|------|-------------|
| `name_exact` | `TEXT` | Clé (comme dans l’API) |
| `ygorg_internal_id` | `BIGINT` | Id pour `GET /data/card/{id}` |

PK : `(name_exact, ygorg_internal_id)`.

### `card_ygorg_unresolved`

Cartes dont le nom n’a pas matché l’index (backfill ne les reprend pas tant que `sync_index` n’a pas effacé la table).

### `card_ygorg_id_map`

| Colonne | Type | Description |
|---------|------|-------------|
| `card_id` | `BIGINT` | PK, FK → `cards` |
| `ygorg_internal_id` | `BIGINT` | Id YGResources |
| `updated_at` | `TIMESTAMPTZ` | Mise à jour |

Sert au **manifest** (ids manifest = YGResources).

---

## 8. Table `ygorg_qa_entries`

*(Migration `20260325200000_ygorg_qa_entries.sql`.)*  
Entrées **`GET /data/qa/{id}`** : cartes concernées (ids internes YGOrg). Remplie par **`mode=sync_qa`**.

| Colonne | Type | Description |
|---------|------|-------------|
| `qa_id` | `BIGINT` | PK |
| `related_ygorg_card_ids` | `BIGINT[]` | Ids du champ JSON `cards` |
| `fetched_at` | `TIMESTAMPTZ` | Dernier fetch |

Index GIN sur `related_ygorg_card_ids` (filtre `WHERE anchor_id = ANY(related_ygorg_card_ids)`). **`card_ygorg_id_map`** : PK sur `card_id` (lookup ancre) + index **`idx_card_ygorg_id_map_ygorg`** sur `ygorg_internal_id` (jointure `= ANY(array)`). Côté navigateur, **`/associations/qa_related`** est mis en cache par `card_id` (voir `static/js/associations/associationFetchCache.ts`).

---

## Table `konami_catalog_snapshots`

*(Migration `20260328140000_konami_catalog_snapshots.sql`.)*  
Données **catalogue** parsées depuis le site officiel Konami (HTML → JSON), **sans** FK vers `cards` (snapshots globaux ou par locale).

| Colonne | Type | Description |
|---------|------|-------------|
| `snapshot_key` | `TEXT` | PK — ex. `pack_index:en` |
| `locale` | `TEXT` | Code locale |
| `kind` | `TEXT` | ex. `pack_index` |
| `source_url` | `TEXT` | URL récupérée |
| `payload` | `JSONB` | Document JSON (liste packs, chemins relatifs, etc.) |
| `fetched_at` | `TIMESTAMPTZ` | Dernier fetch |

Commande : `konami-pack-index`. Voir **`docs/konami-enrichment.md`**.

---

Voir **`docs/db-migrations.md`** : application des migrations (`migrate`, `make test-db`, CI).

---

## Conventions

- **Noms** : snake_case.
- **Temps** : `TIMESTAMPTZ`.
- **Texte** : `TEXT`. **`desc`** évité (mot réservé SQL) → colonne **`card_desc`**.
- **ENUMs** PostgreSQL pour type, attribute, frame_type, ban_*.
