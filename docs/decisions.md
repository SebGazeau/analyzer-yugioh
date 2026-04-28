# Décisions d’architecture

## ADR — Point d’entrée process : dispatch CLI

**Contexte** : `main.rs` accumulait une chaîne de `if` par sous-commande ; le point d’entrée mélangait orchestration process et logique serveur.

**Décision** :

- Le mapping `argv[1]` → handler async vit dans `crate::cli::run_subcommand_if_present` ([`src/cli/dispatch.rs`](../src/cli/dispatch.rs)) ; chaque sous-commande garde son module (`migrate`, `sync_cards`, etc.) et son initialisation `tracing` locale.
- `main` : si `Some(result)` est retourné, propager et quitter ; sinon initialiser `tracing` pour le serveur et lancer `HttpServer` (comportement inchangé).

**Pourquoi** : une seule liste des sous-commandes, moins de duplication, même contrat de sortie `std::io::Result`.

---

## ADR — Frontière HTTP : `src/modules/` vs `src/routes/`

**Contexte** : deux emplacements enregistrent des services Actix ; risque d’ajouter une route métier au mauvais endroit.

**Décision** :

- **`src/modules/<domaine>/`** : nouvelles routes **métier** (catalogue, decks, associations, auth site, sync admin exposé comme handlers, pages). Préférer ce périmètre pour tout handler qui relève d’un domaine produit nommé.
- **`src/routes/`** : routes **transverses** héritées ou techniques — admin HTML inline / dashboard, images (`/images/*`), garde-fous partagés avec `crate::routes` ; éviter d’y ajouter de la logique métier nouvelle sauf nécessité (ex. contrat stable difficile à déplacer dans une slice dédiée).

**Pourquoi** : alignement avec la réorganisation par feature déjà documentée ci-dessous ; règle simple pour les contributions.

---

## ADR — Cartographie racine `src/` (pipelines, CLI, HTTP)

**Contexte** : plusieurs fichiers à la racine de `src/` complètent `modules/` et `db/` ; sans carte, on ne sait pas où brancher un job ou un handler.

**Décision** — référence rapide (chemins = répertoire ou fichier principal) :

| Zone | Rôle | Déclenché par | Notes |
|------|------|---------------|--------|
| `src/main.rs` | Process : CLI dispatch puis serveur | binaire `analyzer-yugioh` | Voir ADR « dispatch CLI ». |
| `src/cli/` | Sous-commandes `migrate`, `sync-cards`, locales, Konami index | `argv[1]` | Pas d’HTTP. |
| `src/app.rs` + `app/register_modules.rs` | Composition Actix, enregistrement des routes | HTTP | `make_app`, scope `/admin`, `/web`, static. |
| `src/modules/` | Handlers métier par domaine | HTTP | Catalogue, decks, associations, `admin_sync`, auth site, pages. |
| `src/routes/` | Admin HTML session/JWT, images, helpers admin partagés | HTTP | Transversal ; ne pas y placer la logique métier nouvelle. |
| `src/db/` | SQL partagé, migrations, loaders (`load_all_cards`, YGOrg, Konami…) | HTTP + CLI + jobs | `DbError` ; repositories parfois dans `modules/*/repository.rs`. |
| `src/cards_sync.rs` | Sync YGOProDeck → `cards` / `card_sets` | CLI `sync-cards`, logique partagée avec admin | `CardSyncError` → `std::io::Error` pour le CLI. |
| `src/card_locales_sync.rs` | Locales cartes (YGO + Konami) | CLI `sync-locales-*` | S’appuie sur `db`, Konami snapshots. |
| `src/ygorganization/` + `ygorganization.rs` | Enrichissement / sync YGOrg | HTTP admin, jobs, `db` | Erreurs `YgOrgError`. |
| `src/konami_catalog/` | Scraping / index catalogue officiel | CLI `konami-pack-index`, locales Konami | |
| `src/card_metadata_fill.rs` | Heuristique `archetype` / `archetype_source` | HTTP admin `preview` / `apply`, scripts enrichissement | |
| `src/ygo_api/` | DTO / mapping proche JSON YGOProDeck | `cards_sync`, import admin | |
| `src/shared/` | Cache recherche, structs communes, utilitaires | Partout côté serveur | |
| `src/auth/`, `src/images/`, `src/storage/` | Auth API, pipeline images, backends fichier/GCS | HTTP | |

**Pourquoi** : une seule table de navigation pour les slices « pipeline » et « HTTP » sans relire tout le graphe d’imports.

---

## ADR — Plan futur : recherche sémantique / RAG

**Contexte** : le dossier [`legacy/`](../legacy/) contient une implémentation **Qdrant + FastEmbed** (routes `/rag/*`) non portée dans le binaire actuel ; réimplémenter sans reproduire ses dettes (identifiants instables, `Mutex` global, source `cards.json` seule).

**Décision** : le découpage en **slices numérotées** (cadrage → modèle → données → embeddings → index → CLI reindex → HTTP → front optionnel → ops) et les **pièges / radar techno** sont maintenus dans **[`docs/rag-semantic-search-slices.md`](rag-semantic-search-slices.md)**. L’ADR slice 0 formalisera les choix (moteur vectoriel, modèle, hébergement) au lancement du chantier.

**Pourquoi** : éviter le copier-coller du legacy tout en capitalisant sur l’historique et en laissant ouverte la comparaison avec l’état des libs au moment du travail.

---

## ADR — `CardSyncError` → `std::io::Error` et lecture du corps HTTP

**Contexte** : la CLI `sync-cards` mappait l’erreur via `to_string()` ; `response.text().await` utilisait `unwrap_or_default()`, masquant une panne de lecture du corps.

**Décision** :

- `impl From<CardSyncError> for std::io::Error` dans [`src/cards_sync.rs`](../src/cards_sync.rs) — le message affiché reste le `Display` de `CardSyncError`.
- En cas d’échec de `text().await`, même politique de retry que pour les erreurs réseau / statut non 2xx (incrément `last_msg`, backoff, puis `HttpRetry`).

**Pourquoi** : erreur explicite, pas de corps vide silencieux, pont CLI uniforme.

---

## ADR — `GET /admin` : handler dans `admin_sync`

**Contexte** : la redirection vers `/admin/login` vivait dans `routes/admin.rs` alors qu’elle est le point d’entrée du périmètre « sync / outils admin » déjà regroupé dans `modules::admin_sync`.

**Décision** : handler `admin_index` déplacé vers [`src/modules/admin_sync/routes.rs`](../src/modules/admin_sync/routes.rs) ; enregistrement via `register_core_and_admin_routes`. URL, statut `303 See Other`, en-tête `Location` inchangés.

**Pourquoi** : réduit la surface « routes génériques » pour un comportement aligné sur le module admin métier.

---

## ADR — TypeScript `SearchApiCard.archetype_source`

**Décision** : le champ est typé `string | null | undefined` (plus `unknown`) pour refléter `Option<String>` sérialisé en JSON (absence de clé ou chaîne). Tests : [`static/js/__tests__/services/searchApiTypesParity.test.ts`](../static/js/__tests__/services/searchApiTypesParity.test.ts), tests serde dans [`src/shared/structs/search_card_dto.rs`](../src/shared/structs/search_card_dto.rs).

---

## ADR — `static/js/utils/user/` (avatar)

**Décision** : `getInitials` vit sous [`static/js/utils/user/`](../static/js/utils/user/) avec un `index.ts` ré-export ; [`main.ts`](../static/js/main.ts) importe depuis ce dossier. Permet d’accrocher d’autres utilitaires « profil / utilisateur » sans encombrer la racine `utils/`.

---

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
**Synthèse réorganisation backend (handlers, `db`, `modules`, repositories)** : [`reorganisation-backend-compte-rendu.md`](./reorganisation-backend-compte-rendu.md).

## 2026-03-28 — Modules métier (`src/modules/`)

**Contexte** : `handlers.rs` et `db.rs` concentraient trop de responsabilités ; besoin d’un découpage vertical (style Nest) avec `helper` / `provider` / `routes` par domaine.

**Décision** :

- Introduire `src/modules/` pour les périmètres métier.
- **Étape 2 (terminée)** : routes HTTP déplacées depuis l’ancien `handlers.rs` vers `modules/<domaine>/routes.rs` (`pages`, `catalog`, `associations`, `admin_sync`, `site_auth`, `decks`), `template_error` + `CARDS_PATH_DEFAULT` dans `modules/mod.rs`.
- **Étape 3.1 (terminée)** : `db` sous `src/db/` par fichier domaine ; voir 3.2 pour ce qui a migré vers `modules/*/repository.rs`.
- **Étape 3.2 (en cours)** : persistance par feature dans `modules/<domaine>/repository.rs` ; `DbError` et le SQL partagé (sync YGOrg, `cards`, Konami, upsert `card_locales`) restent dans `crate::db`.
  - **Slices livrées** : `decks/repository`, `associations/repository` (lecture YGOrg pour `/associations/*` + Q&A related ; `upsert_ygorg_qa_entry` reste dans `db` pour `ygorganization.rs`), `catalog/repository` (recherche / lecture `card_locales` ; `upsert_card_locales` reste dans `db` pour Konami / jobs).
  - **Reste typique dans `db`** : `cards`, `ygorg` (sync / enrichissement), `konami`, écriture `card_locales`, migrations. L’orchestration sync côté job : voir **[`sync-pipeline-jobs.md`](./sync-pipeline-jobs.md)** (pas d’`admin_sync/repository` pour le gros sync).

**Modules livrés** : `decks`, `pages`, `catalog`, `associations`, `admin_sync`, `site_auth` — contrats HTTP inchangés.

**Pourquoi** : lisibilité, ownership par feature, tests de non-régression par slice.

---

## 2026-03-28 — Sync cartes (Cloud Job vs serveur HTTP)

**Contexte** : la récupération des cartes et enrichissements externes ne doit pas rester le chemin principal du serveur HTTP en production ; un **job** (ex. Cloud Run Job) doit orchestrer le pipeline.

**Décision** :

- **Cible** documentée dans **[`docs/sync-pipeline-jobs.md`](./sync-pipeline-jobs.md)** (structure fichiers, flux `main` / `bin/sync_cards` / `admin_sync`, invariants, mermaid).
- **Pas** d’`admin_sync/repository` dédié pour « posséder » le sync : la logique commune vit dans un module **`sync::pipeline`** (ou nom équivalent), appelé par le **binaire job** ; les routes admin ne font qu’**orchestrer un déclenchement** (prod) ou déléguer au pipeline (dev).
- Le crate **`db`** (et modules existants `cards_sync`, `ygorganization`) restent les briques bas niveau ; le pipeline les enchaîne sans dupliquer le SQL dans les handlers.

**Pourquoi** : une seule source de vérité pour l’ordre des étapes de sync, alignement prod avec Cloud Job, serveur HTTP focalisé sur le trafic et le cache.

---

## 2026-04-07 — Builder : aperçu recherche flottant + fiche popover (2 col, desc)

**Contexte** : pas d’URL « artwork only » dans le pipeline cartes ; l’aperçu sous les filtres occupait trop de place verticale ; le popover deck ne montrait pas le texte d’effet.

**Décision** :

- **Illustration** : recadrage **CSS** réutilisable (`.card-art-crop` / `object-position` heuristique) pour le popover et l’aperçu recherche.
- **Popover** : bandeau en **grille 2 colonnes** (art | nom, types, badges, zone desc scrollable) ; `DeckRow` / factory portent `cardDesc` ; complément **lazy** via `fetchCardByName` si la ligne n’a pas encore de `desc`.
- **Recherche** : nœud **`#search-card-float`** en `position: fixed`, créé dans `setupSearch`, suit le pointeur (clamp viewport) ; `pointerenter` / `pointerleave` sur le flottant pour permettre le scroll du texte sans masquer immédiatement au passage souris.

**Pourquoi** : moins de hauteur dans le flux, même langage visuel fiche + effet lisible ; limite connue : le flottant reste orienté souris (pas d’aperçu au focus clavier sur les lignes).

---

## 2026-04-12 — Métadonnées produit display : dérivation des `pull_probability`

**Contexte** : le moteur [`crates/ygo-engine`](../crates/ygo-engine) attend des `pull_probability` déjà renseignées ; les défauts YGOPRODECK (mapper par rareté moteur) ne reflètent pas la composition réelle d’un display scellé.

**Décision** :

- Une couche **`product_model`** ([`src/modules/ygo/product_model.rs`](../src/modules/ygo/product_model.rs)) et une route **`POST /admin/ygo/derive-pulls`** calculent des probas à partir de **comptages par libellé de rareté par display** et des lignes du tableau (`cardmarket_set_rarity` si présent, sinon `rarity` moteur), avec **clé normalisée** : minuscules, sans espaces ni ponctuation (ex. « Secret Rare » et `SecretRare` → même clé).
- **Répartition** : masse `count_L / Σ counts` pour le libellé `L`, répartie **uniformément** entre les lignes dont la clé matche `L`.
- **Somme** : après affectation, mise à l’échelle pour que la somme des probas sur les lignes vaille **`1 − bulk_mass`** (paramètre optionnel `bulk_mass` ∈ \[0, 1\], défaut 0) — le reste représente une masse hors tableau (bulk non modélisé).
- **`display_cost`** : l’outil ne convertit pas automatiquement display ↔ case ; l’utilisateur doit aligner le **coût** sur l’**unité** analysée (un display vs une case) et les **comptages** sur la même unité.
- Champs **`cards_per_booster`**, **`boosters_per_display`**, **`displays_per_case`** : acceptés dans le JSON pour compatibilité future, **ignorés** par la v1 de dérivation.

**Pourquoi** : garder `analyze()` inchangé tout en permettant d’ancrer les probas sur des hypothèses explicites ; avertir l’utilisateur lorsque des comptages n’ont aucune ligne correspondante.

---

## 2026-04-12 — Case scellée : mode `case_expected_copies` (quotas + distincts)

**Contexte** : analyser une **case** avec des quotas de hits par rareté et un nombre de **cartes distinctes** dans le set par rareté ; le mode « masse relative » (`slot_mass`) ne convient pas (somme des pondérations = 1, interprétation « un tirage »).

**Décision** :

- **`derive_mode`** dans le JSON `DerivePullsRequest` : `slot_mass` (défaut, comportement inchangé) ou **`case_expected_copies`**.
- **`distinct_counts`** : même structure que `counts` (libellé + entier) ; en mode case, pour chaque clé `k` issue de `counts` avec un quota `Q_k > 0`, une entrée **distincte** `D_k > 0` est requise (même normalisation de clé que les comptages).
- **Sémantique** : pour chaque ligne du tableau dont la clé est `k`, `pull_probability` = **espérance du nombre d’exemplaires de cette ligne par case** : `E_i = Q_k / D_k` (hits i.i.d. uniformes sur les `D_k` cartes du set — approximation **avec remise** ; la variance réelle sans remise n’est pas modélisée ici).
- **Cohérence** : si le nombre de lignes du tableau qui matchent `k` est `m_k` et `m_k > D_k` → **erreur** (plus de lignes modélisées que de cartes distinctes). Si `m_k < D_k` → **warning** : une partie des hits attendus tombe sur des cartes absentes du tableau (EV sous-estimée côté lignes listées).
- **`bulk_mass`** : **non pris en charge** en mode case (doit être 0 ou absent) — sinon erreur explicite.
- **`display_cost`** : inchangé côté moteur ; l’utilisateur saisit le **coût de la case** lorsque les `pull_probability` sont des espérances par case.
- **Évolution** : simulation Monte Carlo ou agrégation sans remise pourrait compléter l’EV ponctuelle ; hors scope de cette slice (moteur linéaire conservé).
- **Piste Monte Carlo (non implémentée)** : échantillonner des ouvertures de case (tirages par rareté avec ou sans remise au sein du pool `D_k`), en déduire une distribution du **profit net** ou des quantiles ; resterait un module ou endpoint **séparé** de `POST /admin/ygo/analyze` pour ne pas mélanger signal EV ponctuel et analyse de risque simulée.

**Pourquoi** : linéarité de l’espérance ⇒ `analyze()` reste `Σ pull_probability × prix_réalisable` avec une lecture monétaire cohérente « par case » sans modifier `ygo-engine`.

---

## 2026-04-12 — Konami : comptages rareté / display pour dérivation auto

**Contexte** : besoin éventuel d’importer des totaux officiels.

**Constat** : le module [`src/konami_catalog/`](../src/konami_catalog/) indexe listes de packs et pages liste de cartes (`parse_pack_index_html`, `parse_pack_listing_card_rows`) — **pas** de extraction des comptages « rareté par display / case » dans le code actuel.

**Décision** : pas d’import automatique Konami pour cette slice ; saisie manuelle ou JSON via l’admin. Une évolution ultérieure exigerait une source HTML/PDF stable et un parseur dédié + validation manuelle.

---

## ADR — Insights « Fidraulis » : allowlist + heuristique texte

**Contexte** : pour **Fidraulis Harmonia**, le deckbuilder doit aider à repérer des **Synchros Extra** dont un effet peut s’activer après **envoi au Cimetière** ; inférer cela uniquement depuis le texte d’effet est **non fiable** (multilingue, formulations PSCT).

**Décision** :

- **`kind`** `fidraulis_gy_synchro` : liste les Synchros Extra du deck courant avec badge **Vérifié** (passcode dans [`static/js/insights/fidraulisGyAllowlist.ts`](../static/js/insights/fidraulisGyAllowlist.ts)) ou **Heuristique** (motifs limités sur `cardDesc` dans [`static/js/services/insights/fidraulisGyHeuristic.ts`](../static/js/services/insights/fidraulisGyHeuristic.ts)).
- **Taxonomie « quel effet » (v1)** : union `FidraulisGyResourceTaxon` + libellés FR dans [`static/js/insights/fidraulisGyTaxonomy.ts`](../static/js/insights/fidraulisGyTaxonomy.ts) ; chaque entrée allowlist porte un `taxon` documenté ; les lignes heuristiques utilisent `inferFidraulisGyResourceTaxon` (approximatif). Colonne **Contexte** sur le tableau deck (sans bouton « Chercher ») ; encart GET agrégé avec **Contexte** + **Chercher** par ligne pour ouvrir la recherche Builder.
- **Motif « déjà au Cimetière » (2026-04)** : PSCT du type **« If this card is in your GY: »** / **« Si cette carte est dans votre Cimetière : »** (ex. effet Quick 2 de **PSY-Framelord Omega**) n’entre pas dans les motifs « envoyé au GY » ni « tant que sur le Terrain ou au Cimetière » ; détection dédiée `cardDescLooksLikeGyIfInGyActivated` + taxon `effect_if_in_gy`, avec **parité** [`card_desc_looks_like_gy_if_in_gy_activated`](../src/modules/insights_fidraulis_telemetry/rule.rs) pour la télémétrie. Limite : toute carte partageant cette tournure peut être un **faux positif** heuristique. À l’ajout d’un 2ᵉ exemplaire depuis la recherche, `tryAddCardToDeckSection` **complète** `cardDesc` si absent (aide l’heuristique après +1).
- **Priorité** : si allowlist et heuristique s’appliquent à la même carte, **Vérifié** l’emporte.
- **Sans candidat** : pas d’insight (évite un onglet bruité).

**Pourquoi** : livrer une valeur deck-building tout en assumant explicitement les limites ; la allowlist reste la source de vérité pour les cartes critiques, l’heuristique élargit la couverture avec avertissement UI.

---

## ADR — Télémétrie agrégée Fidraulis (POST après sauvegarde + GET)

**Contexte** : agréger des signaux « deck sauvegardé avec insight Fidraulis non nul » pour proposer un encart stats sans exposer les decks individuels.

**Décision** :

- **Env** `FIDRAULIS_INSIGHT_TELEMETRY` : `off` (défaut) → 404 ; `log` → `tracing` sans SQL ; `on` / `persist` → écritures + GET.
- **POST** `/insights/fidraulis/telemetry` : session site + en-tête `X-CSRF-Token` ; corps `deck_id`, `fingerprint` (SHA-256 de chaîne canonique `rule_version|zones`), zones `main`/`extra`/`side` en `{ passcode, qty }` ; re-vérif Rust sur `CardCache` (parité allowlist + heuristique + `api_type_line`) ; **204** si empreinte inchangée pour `(user, deck)` ; JSON `accepted.synergy_verified` / `accepted.synergy_heuristic` / `rejected.not_in_cache` / `delta` / `baseline_only` (pas de persistance pour l’Extra « brut » hors critères synchro ressource GY).
- **Incréments delta (par `(site_user_id, deck_id)`)** : les colonnes `synergy_*_pass` dans `insight_fidraulis_passcode_stats` ne montent que pour les passcodes **nouveaux** ou **changés de statut** (vérifié ↔ heuristique) par rapport aux tableaux `last_synergy_verified` / `last_synergy_heuristic` stockés dans `insight_fidraulis_deck_last_sync` ; retirer une carte synergy de l’Extra **ne diminue pas** les totaux globaux. **Baseline** : lignes `deck_last_sync` créées avant la migration des tableaux synergy (`NULL`) → premier POST `persist` après upgrade **ne bump pas** les stats, seulement enregistre l’état courant (évite un pic « tout le deck »).
- **GET** `/insights/fidraulis/aggregate` : pagination `limit`/`offset` ; lignes avec `synergy_verified_pass + synergy_heuristic_pass > 0` ; score `verified*10 + heuristic` ; cache mémoire ~45 s côté serveur ; invalidation après POST persist.
- **Empreinte** : documentée dans [`docs/fidraulis-telemetry-verification.md`](fidraulis-telemetry-verification.md) ; alignement TS [`static/js/insights/fidraulisTelemetryFingerprint.ts`](../static/js/insights/fidraulisTelemetryFingerprint.ts) / Rust `fingerprint` module.
- **CGU / confidentialité** : livrable séparé (voir [`TASK.md`](../TASK.md) entrée dédiée).

**Pourquoi** : anti-flood par empreinte, pas de confiance aveugle au client (re-hash + règles serveur), rollback par feature flag ; le delta évite de regonfler les scores à chaque « Mettre à jour » du builder quand seule une partie du deck change.

---

## ADR — Fidraulis GY : votes utilisateurs + validation admin

**Contexte** : l’allowlist statique (TS + Rust) ne scale pas ; on veut un signal communautaire tout en gardant une **porte d’audit** admin.

**Décision** :

- **Tables** : `insight_fidraulis_gy_user_vote` (`site_user_id`, `passcode`, `verdict` approve/reject, PK couple) ; `insight_fidraulis_gy_admin_validated_passcode` (`passcode` PK, `validated_at`, `admin_user_id` optionnel). Seed initial = passcodes de l’ancienne allowlist.
- **« Vérifié »** : union **allowlist statique** (transition) **ou** passcode **admin validé** ; exposé au dashboard via `data-fidraulis-gy-admin-validated` (JSON) + endpoints `GET /insights/fidraulis/gy/validated-passcodes` ; télémétrie Rust charge le set admin en base avant `rule::analyze`.
- **Votes** : uniquement sur lignes **heuristiques** du tableau Suggestions ; **session site** + **CSRF** ; `POST /insights/fidraulis/gy/vote` ; **409** si déjà voté ou conflit ; **interdit** si passcode déjà admin-validé. `GET /insights/fidraulis/gy/vote-state?passcodes=…` pour l’état par utilisateur.
- **Admin** : page `/admin/fidraulis-gy` (même garde-fou `/admin`) : file des passcodes avec votes et **non** validés, tri score (oui − non) ; `POST /admin/fidraulis-gy/validate` ajoute la ligne admin.

**Pourquoi** : un vote par utilisateur et par passcode limite le spam ; la validation admin fige le contrat « vérifié » sans redéployer le code pour chaque carte.

---

## ADR — Reset mot de passe sans email (2FA + support/admin)

**Contexte** : l’auth site ne collecte pas encore d’email utilisateur ; un flux « mot de passe oublié » classique par lien email n’est donc pas possible sans canal secondaire vérifié.

**Décision** :

1. Introduire un parcours **autonome** pour les comptes avec 2FA actif: `forgot-password` -> `verify-2fa` -> `verify-recovery-code` -> `reset-password`.
2. Introduire un parcours **support/admin** pour les comptes sans 2FA: ticket support -> vérification présentielle hors app -> émission d’un code temporaire à usage unique communiqué par téléphone -> `reset-password`.
3. Forcer l’activation 2FA après reset pour les comptes non équipés (`force_enable_2fa_after_reset`).
4. Journaliser chaque transition sensible (demande, validation, émission, reset) dans `security_audit_events`.
5. Invalider toutes les sessions/refresh tokens à la fin du reset.

**Pourquoi** : sans email ni canal secondaire déjà vérifié, la vérification d’identité doit passer par une étape humaine stricte ; le double parcours limite la friction pour les comptes déjà durcis (2FA) tout en gardant un chemin de récupération pour les comptes historiques.

**Doc de référence** : `docs/password-reset-2fa-admin-workflow.md`.

---

## ADR — Reset password: enforcement 2FA + session_epoch

**Contexte** : après reset, il fallait forcer l’activation 2FA sur comptes non équipés et invalider les sessions antérieures sans store de sessions serveur.

**Décision** :

1. Ajouter `site_users.session_epoch` ; chaque reset mot de passe incrémente cette valeur.
2. Stocker `site_user_session_epoch` en session au login/register ; comparer avec la valeur DB sur routes protégées (decks/compte).
3. Maintenir `force_enable_2fa_after_reset` tant que l’onboarding 2FA n’est pas validé (`/auth/2fa/setup` puis `/auth/2fa/enable`).
4. Ajouter une page utilisateur `/auth/2fa/enforce` et une page support `/mot-de-passe-oublie`.
5. Ajouter la file admin `/admin/password-reset` + endpoint `/admin/password-reset/queue`.

**Pourquoi** : cette approche fournit une révocation globale pragmatique et un guard d’enforcement 2FA sans introduire un store de sessions dédié.

---

## ADR — Profil 2FA : ré-auth obligatoire + TTL setup + rotation recovery

**Contexte** : pour réduire le parcours support/admin lors d’un oubli de mot de passe, il faut pousser l’activation 2FA directement depuis `Mon compte`, tout en gardant un niveau de sécurité élevé sur des actions sensibles.

**Décision** :

1. Ajouter des endpoints dédiés session utilisateur: `POST /mon-compte/2fa/setup`, `POST /mon-compte/2fa/enable`, `POST /mon-compte/2fa/recovery-codes/rotate`.
2. Exiger `current_password` + vérification CSRF pour chaque endpoint profil 2FA.
3. Appliquer un TTL court (`twofa_setup_expires_at`, 10 min) au secret intermédiaire de setup; un setup expiré est invalidé avant activation.
4. Régénérer systématiquement un nouveau lot de recovery codes à l’activation 2FA et lors d’une rotation manuelle.
5. Journaliser les actions via `security_audit_events` (`profile_twofa_setup_started`, `profile_twofa_enabled`, `profile_twofa_recovery_codes_rotated`).

**Pourquoi** : améliorer l’UX de récupération autonome tout en empêchant qu’une session seule (sans mot de passe courant) suffise à prendre le contrôle du second facteur.

---

## 2026-04-28 — Shell UI admin (HTML inline + CSS statique)

**Contexte** : les pages admin partageaient un style inline minimal, des actions répétées sur plusieurs écrans (hub connecté, token, file Fidraulis), et un découpage visuel peu lisible pour les opérations à risque.

**Décision** :

- Conserver le rendu **HTML inline** existant (`include_str!`) pour limiter l’impact architecturel.
- Introduire une feuille de style dédiée [`static/css/admin.css`](../static/css/admin.css), liée depuis les templates admin.
- Centraliser la navigation et les actions via fragments partagés (`dashboard_nav.html`, `dashboard_actions.html`) avec sections/cartes et ancres stables.
- Dédupliquer les formulaires d’actions : les pages login connecté et token n’embarquent plus les mêmes blocs de formulaires en double.
- Préserver strictement le contrat des jobs admin : mêmes routes, méthodes HTTP et paramètres (`hidden` compris) pour toutes les actions existantes.

**Pourquoi** : obtenir une UX admin plus claire et maintenable sans migration front complète, tout en gardant les comportements serveur inchangés.
