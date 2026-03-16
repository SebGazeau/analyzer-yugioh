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

## Conventions

- **Noms** : snake_case.
- **Temps** : `TIMESTAMPTZ`.
- **Texte** : `TEXT`. **`desc`** évité (mot réservé SQL) → colonne **`card_desc`**.
- **ENUMs** PostgreSQL pour type, attribute, frame_type, ban_*.
