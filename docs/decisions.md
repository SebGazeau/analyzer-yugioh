# Décisions d’architecture

## ADR — Complément métadonnées cartes (phase 1 : prévisualisation)

**Contexte**

- Le catalogue principal `cards` provient de YGOProDeck.
- L’enrichissement YGOrganization stocke des couches brutes dans `card_enrichment_layers` (`source = ygorganization`, `layer = card_raw`).
- Certaines cartes ont `archetype` NULL ou vide côté YGOProDeck alors qu’on dispose déjà d’une couche YGOrg exploitable pour une future dérivation.

**Décision (phase 1)**

1. Ajouter `cards.archetype_source` (TEXT NULL) pour tracer la provenance lorsqu’on écrira un archétype complété hors YGOProDeck (phase ultérieure).
2. Exposer un endpoint admin **lecture seule** qui liste les **candidats** au complément : `archetype` absent ou vide **et** présence d’au moins une ligne `card_enrichment_layers` avec `source = ygorganization` et `layer = card_raw`.
3. **Aucun `UPDATE`** en phase 1 ; pas d’écrasement des valeurs YGOProDeck déjà présentes (règle **NULL-only** pour les futures écritures).

**Priorité des sources (futures phases)**

1. YGOProDeck (import `fetch_cards`) — référence pour les champs du dump.
2. Dérivation contrôlée depuis les couches YGOrg / autres sources documentées, avec `archetype_source` renseigné.

**Endpoint**

- `GET /admin/preview_card_metadata_fill?max=…` (authentification admin identique aux autres routes `/admin`).
- Réponse `text/plain` : en-têtes commentés + CSV `id,name,name_en`.

---

## ADR — Phase 2 : application du complément `archetype`

**Décision**

1. **Dérivation** : le JSON YGResources (`card_raw`) n’expose pas d’archétype officiel dans les champs déjà exploités ; on utilise une heuristique sur `cardData.en.effectText` : motif `"Nom" monster` (priorité à la première ligne pour le cas ancré en tête de chaîne ; sinon premier motif sur la ligne).
2. **Champ explicite** : si `cardData.en.archetype` apparaît un jour dans l’API, il est pris en priorité (même sanitization).
3. **Écriture** : `UPDATE` uniquement si `archetype` est NULL ou vide (trim) — **NULL-only** inchangé. On renseigne `archetype_source = ygorg_effect_en`.
4. **Endpoint** : `GET /admin/apply_card_metadata_fill?max=N&write=1` pour appliquer ; sans `write=1`, rapport de simulation uniquement. Après écriture : `load_all_cards` + remplacement du cache mémoire (comme après `fetch_cards` côté DB).
5. **Limites** : sorts/pièges ou effets sans motif `"…" monster` ne sont pas dérivés ; risque de faux positifs limité en ne publiant que les cartes déjà « candidates » (sans archétype YGOProDeck + `card_raw` présent).

---

## ADR — Phase 3 : consommation applicative + heuristique Spell/Trap

**Décision**

1. **Heuristique étendue** : pour `cardData.en.cardType` contenant `spell` ou `trap`, tenter sur la **première ligne** de `effectText` le motif `(?i)\badd\s+1\s+"…"\s+card\b` (ex. *Add 1 "Branded" card*). Même `archetype_source` que les monstres (`ygorg_effect_en`). Les monstres avec *add 1 "X" card* dans le corps ne sont pas traités par ce motif (évite les faux positifs).
2. **API** : `GET /search` et `GET /associations/catalog` exposent **`archetype_source`** lorsqu’il est renseigné en base (champ omis du JSON sinon). Le cache mémoire est alimenté via `load_all_cards`, qui sélectionne désormais `archetype_source`.
3. **Fichier `cards.json` / JSON YGOProDeck** : `RawCardSearchResult` accepte l’absence de clé `archetype_source` (`serde(default)`).

---

## ADR — Phase 4 : affichage front (`archetype_source`)

**Décision**

1. **TypeScript** : `AssociationCatalogCard` inclut `archetype_source` optionnel ; `normalizeCatalogCard` / `toAssociationCatalog` le relaient depuis l’API.
2. **Recherche builder** : la ligne sous-type des monstres inclut l’**archétype** quand présent ; un **badge** discret (`data-search-archetype-source`) affiche un libellé court (ex. `YGOrg` pour `ygorg_effect_en`) avec `title` explicatif.
3. **Modal « cartes associées »** : bloc ancre — ligne **Provenance archétype** si `archetype_source` est renseigné (`data-associations-archetype-source` + code brut) ; fusion catalogue → ancre étendue à `archetype` / `archetype_source` / `image_url` ; le rapport d’associations utilise l’ancre **fusionnée** pour aligner archétype catalogue et recherche partielle.
4. **Module partagé** : `static/js/associations/archetypeSourceUi.ts` centralise le mapping libellé / infobulle (évite divergence recherche / modal).

---

## ADR — Job d’enrichissement planifié

**Décision**

- Enrichissement **incrémental** via `scripts/enrichment_job.sh` : enchaîne `init` (optionnel), `backfill`, `manifest`, `sync_qa`, puis `apply_card_metadata_fill` avec des **plafonds** et **pauses** configurables.
- **`sync_index`** hors routine (opt-in `ENRICH_RUN_SYNC_INDEX=1`) pour limiter bande passante et charge DB.
- **Écriture** `cards.archetype` / `archetype_source` uniquement si `ENRICH_METADATA_FILL_WRITE=1` ; défaut simulation.
- Déploiement optionnel : service `enrichment-job` (`docker-compose.enrich-job.yml`, profil `enrich`), boucle avec `ENRICH_INTERVAL_SEC` (ex. 3600 s).

**Doc** : `docs/enrichment-job.md`.

---

## ADR — Optimisation « cartes associées » (transfert + cache)

**Décision**

1. **Compression gzip** : `actix-web` avec la feature `compress-gzip` et `.wrap(Compress::default())` sur l’app — réponses JSON (dont `/associations/catalog`) compressées lorsque le client envoie `Accept-Encoding: gzip`.
2. **Préchargement idle** : `prefetchAssociationCatalogWhenIdle()` dans `associationFetchCache.ts`, appelé depuis `initBuilder()` — `requestIdleCallback` (repli `setTimeout`) pour peupler le cache catalogue avant le premier clic sur « cartes associés ».

**Doc** : `docs/associations-data-by-angle.md` §6.

---

## ADR — Associations : archétype YGOrg multi-lignes + blocklist mots du nom

**Décision**

1. **Dérivation `archetype`** (`card_metadata_fill.rs`) : si la 1ʳᵉ ligne de `effectText` ne donne rien, parcourir jusqu’à **15 lignes** suivantes avec les mêmes motifs `"…" monster` / matériel en tête de ligne ; ignorer les citations de plus de **5 mots** (noms de carte complets type pierres White Stone).
2. **Citations « mot du nom »** (`dynamicTextMentions.ts`) : blocklist **`NAME_WORD_YGO_GENERIC_BLOCKLIST`** (types de monstre, couleurs, termes ultra-fréquents EN/FR) — **sans** toucher aux règles issues du champ structuré `archetype`.

**Effet attendu** : cartes type *Fallen of the White Dragon* peuvent recevoir **Blue-Eyes** (ou autre) après `apply_card_metadata_fill` si le JSON YGOrg le permet ; la modal ne crée plus d’angles *dragon* / *white* depuis le seul nom.
