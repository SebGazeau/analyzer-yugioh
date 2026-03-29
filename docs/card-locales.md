# Traductions (`card_locales`)

## Rôle

- La table **`cards`** reste le catalogue **par passcode** (sync YGOProDeck `sync-cards`).
- **`card_locales`** stocke **nom + texte** pour une **locale** (`fr`, `de`, `ja`, …), avec **`source`** (`ygoprodeck`, `konami_official`, …).
- **PK** `(card_id, locale)` : une ligne par carte et par langue ; en cas de réécriture, **dernière écriture gagne** (jobs).

## Jobs (CLI, même binaire que l’app)

1. **`sync-cards`** — prérequis : lignes dans `cards`.
2. **`sync-locales-ygo`** — remplit les locales listées dans **`CARD_LOCALES_YGO`** (défaut `fr,de,it,pt`) via `cardinfo.php?misc=yes&language=`.
3. **`konami-pack-index`** — snapshot **`pack_index:{locale}`** (liste des produits).
4. **`sync-locales-konami`** — optionnel : textes officiels site Konami pour la même **`KONAMI_LOCALE`** ; limiter en dev avec **`KONAMI_LOCALE_SYNC_MAX_PACKS`**, **`KONAMI_LOCALE_SYNC_MAX_DETAILS`**, **`KONAMI_REQUEST_DELAY_MS`**.

## HTTP

- **`GET /search?q=…&locale=fr`** (Postgres requis) : étend la recherche au **nom / texte** dans `card_locales`, et renvoie **`name` / `desc`** traduits quand une ligne existe.
- Le builder envoie **`locale`** à partir de **`<html lang>`** (ex. `lang="fr"` → `locale=fr`). Pour `lang` absent ou `en*`, le paramètre n’est pas ajouté.
- **`GET /card?name=…&locale=fr`** : après échec sur le nom cache, résolution par **`card_locales`** (nom exact ou candidats ILIKE + normalisation).
- **`GET /admin/reload_cache_from_db`** (même garde-fous que les autres routes `/admin`) : recharge le cache mémoire depuis la table **`cards`** sans appeler l’API YGOProDeck. Utile après un job **`sync-cards`** pendant que l’app tournait déjà. Les seules **`card_locales`** ne nécessitent en général **pas** ce reload pour `/search?locale=…`.

## Tests

- **Unitaires (Rust, `cargo test`)** : `db::ilike_pattern_tests` (motifs `ILIKE`), `card_locales_sync::tests` (construction d’URL YGO), parse HTML Konami dans `konami_catalog` (déjà présent).
- **HTTP** : `test_search_with_locale_param_returns_200`, `test_admin_reload_cache_from_db_without_postgres_returns_503` (`tests/http_integration.rs`).
- **Postgres réel (ignoré par défaut)** : `db_live_card_locales_search_fetch_resolve` — `TEST_DATABASE_URL=… cargo test db_live_card_locales -- --ignored`.
- **E2E Playwright** : `static/e2e/search-locale.spec.ts` — vérifie que la recherche envoie **`locale=fr`** lorsque `<html lang="fr">` (CI : job Integration avec app + Postgres).

Ce qui reste **sans** test automatisé ciblé : jobs CLI `sync_ygoprodeck_locales` / `sync_pack_card_locales` (HTTP externes + DB bout-en-bout), `overlay_search_dto_image_url` (mock images).

## Fichiers utiles

- Migration : `migrations/20260329120000_card_locales.sql`
- Sync YGO : `src/card_locales_sync.rs`
- Sync Konami : `src/konami_catalog.rs` (`sync_pack_card_locales`)
- Accès DB : `src/db.rs` (`upsert_card_locales`, `fetch_card_locales_map`, …)
