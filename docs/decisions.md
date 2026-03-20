# Carte de migration — Yugi-Analyzer

**Rôle** : Architecte Senior spécialisé migration Rust  
**Code actuel** : **Rust** (backend) + **TypeScript** (frontend)  
**Objectif** : Structurer une évolution sans dette cognitive (Type-Driven Design, Result, Borrow Checker, invariants Yu-Gi-Oh, tests).  
**Statut** : Décisions sur perf recherche, validation deck et RAG reindex finalisées (voir §8).

---

## 1. Contexte et périmètre

| Couche | Langage | Fichiers clés |
|--------|---------|----------------|
| Backend API | Rust | `src/handlers.rs`, `src/services.rs`, `src/models.rs`, `src/rag/*`, `src/config.rs` |
| Frontend | TypeScript | `static/js/*.ts` (api, deck, search, category, stats, utils, main) |
| Templates | Tera (HTML) | `templates/*.html` |
| Données | JSON (API YGOProDeck) | `assets/cards.json` |

La « migration vers Rust » couvre ici :
- **Consolidation du backend Rust** (types, erreurs, mémoire, invariants).
- **Option** : déplacer une partie de la logique métier front (deck, stats, validations) côté Rust (API ou WASM) pour garantir les règles Yu-Gi-Oh au niveau du type system.

---

## 2. Analyse des types et domaines

### 2.1 Inventaire actuel

**Rust — modèles explicites :**
- `models.rs` : `Card` (name), `Query` (q).
- `rag/types.rs` : `CardDoc`, `IndexReport`, `SearchHit`, `SearchHitPayload` (champs riches : type, race, level, atk, def, etc.).
- `config.rs` : `AppConfig` (Qdrant, embedding, batch).
- `rag/indexer.rs` : `RawCard`, `CardsData` (deserialisation API YGOProDeck).

**Rust — types implicites / génériques :**
- `services.rs` : usage massif de `serde_json::Value` pour cartes et filtres (pas de struct typée côté recherche classique).
- Handlers : réponses HTTP parfois en body string, parfois JSON libre.

**TypeScript — interfaces :**
- `api.ts` : `Card` avec `name`, `name_en?`, `[key: string]: any` (objet ouvert, pas de garantie de `id`/`type`/`race`/`level`/`attribute`).
- `deck.ts` : utilisation de `card.id`, `card.type`, `card.race`, `card.level`, `card.attribute` sans typage strict.
- `stats.ts` : agrégations par `data-type` / `data-attribute` (DOM), pas de modèle de carte partagé.

### 2.2 Transformation objets/classes → Enums et Structs Rust

| Source actuelle | Cible Rust recommandée | Notes |
|-----------------|-------------------------|--------|
| `Card` (TS) / `serde_json::Value` (services) | **Struct** `Card` (ou `CardSearchResult`) avec tous les champs utilisés par le front (id, name, type, race, level, attribute, etc.) | Un seul type « carte » côté API search pour éviter Value partout. |
| Types de cartes (string "Monster", "Spell", "Trap") | **Enum** `CardType` (ex. `Monster`, `Spell`, `Trap`) + sérialisation serde vers string | Garantit les valeurs autorisées au niveau du type. |
| Catégories deck (Starter, Extender, etc.) | **Enum** `DeckCategory` (ou newtype + validation) | Aligné sur `category.ts` (CATEGORY_GROUPS, categoryOptions). |
| Moteurs deck (Engine 1, 2, 3, Staple) | **Enum** `EngineKind` | Évite des strings arbitraires. |
| Réponse `/search` (liste de cartes) | **Struct** `SearchResponse { cards: Vec<CardSearchResult> }` | Remplacer `Vec<Value>` par un type dédié. |
| Deck (côté front : liste de lignes avec name, type, qty, engine, categories) | **Struct** `DeckEntry` + `Deck { entries: Vec<DeckEntry> }` pour export/import et futures API | Permet de valider côté Rust (limites 40–60, max 3 par carte, etc.). |

**Enums à introduire pour le domaine :**
- `CardType` (Monster / Spell / Trap, éventuellement sous-types si besoin).
- `CardFrameType` si on veut typer `frameType` (normal, effect, ritual, etc.).
- `DeckCategory` pour les tags (Starter, Extender, …).
- `EngineKind` pour Engine 1/2/3, Staple.

### 2.3 Où l’immuabilité par défaut de Rust pose problème

| Zone | Problème | Piste |
|------|----------|--------|
| **Tera / templates** | `get_template()` utilise `OnceLock` ; `create_template()` peut panic. Pas de mutabilité directe, mais initialisation unique et erreur non propagée. | Retourner `Result` et propager jusqu’au main / handler ; pas de `panic!` dans la lib. |
| **VectorStore** | Méthodes `upsert(&mut self, …)` et `search(&self, …)` ; partagé via `Arc<Mutex<VectorStore>>` car Actix exige un clone par worker. | Garder `Arc<Mutex<…>>` ; documenter que le « mut » est pour l’API Qdrant (upsert), pas pour la concurrence interne. |
| **EmbeddingService** | `embed_texts(&mut self, …)` et `embed_texts_immutable(&self, …)` ; à l’intérieur, `Mutex` sur le modèle. | Préférer une seule API immuable (`embed_texts_immutable`) pour éviter de forcer `&mut self` partout. |
| **Handlers** | Contexte Tera et insertion dans `Context` (mut). | Déjà local au handler ; pas de conflit avec l’immuabilité globale. |
| **Config** | `AppConfig` clonée et passée en `web::Data`. | Immutable après chargement ; pas de souci. |
| **Frontend (si logique migrée en Rust)** | État mutable du deck (ajout/suppression de lignes, qty, catégories). | Modéliser en Rust par des structs qui prennent l’état précédent et retournent le nouvel état (style immutable update) ou par un petit state machine. |

---

## 3. Gestion des erreurs

### 3.1 Échecs silencieux et exceptions actuelles

**Rust — endroits identifiés :**

| Fichier | Ligne / zone | Comportement actuel | Risque |
|---------|--------------|---------------------|--------|
| `services.rs` | `filter_cards` | `json["data"].as_array().unwrap_or(&vec![])` | Données mal formées → liste vide, pas d’erreur remontée. |
| `handlers.rs` | index | `get_template().expect("REASON")` | Panic si template non chargé. |
| `templates.rs` | `create_template` / `get_template` | `panic!()` en cas d’erreur Tera | Panic en production. |
| `routes/rag.rs` | health, reindex, search | `vector_store.lock().unwrap()` | Panic si mutex empoisonné. |
| `config.rs` | `load_config` / `load_config_with_secrets` | `embed_batch.parse().unwrap_or(64)` | Acceptable ; autre chose : préférer un type « config validée » après parse. |
| `rag/vector_store.rs` | search | `Uuid::parse_str(…).unwrap_or_else(\|_\| Uuid::nil())` ; `serde_json::from_value(payload).unwrap_or_default()` | Données Qdrant invalides → UUID nil / payload vide au lieu d’une erreur. |
| `rag/indexer.rs` | reindex | `serde_json::to_value(c).unwrap_or_default()` | Une carte mal sérialisée disparaît silencieusement du payload. |

**TypeScript — endroits identifiés :**
- `api.ts` : `fetchCardByName` retourne `null` en cas d’erreur réseau ou JSON ; pas de distinction erreur / « pas trouvé ».
- `deck.ts` : `importDeckFromFile` : `catch (err)` → `alert(...)` ; pas de typage d’erreur ni de log structuré.
- `search.ts` : `fetch(...).then(res => res.json())` : pas de gestion d’erreur sur `res.ok` ou `res.json()`.
- `stats.ts` : `updateCategorySummary` dans un `try/catch` avec `console.error` ; pas de remontée d’erreur.

### 3.2 Stratégie basée sur `Result<T, E>`

**Principes :**
- **Backend Rust** : ne plus utiliser `expect` / `panic!` pour les erreurs récupérables ; faire remonter des `Result` avec des types d’erreur dédiés.
- **Types d’erreur** : introduire des enums `thiserror` (ou équivalent) par domaine, ex. :
  - `TemplateError`, `ConfigError`, `CardLoadError`, `SearchError`, `RagError` (embedding, vector store, indexation).
- **Services** :
  - `load_cards_from_file` : déjà `Result<Value, String>` ; à terme retourner `Result<Vec<Card>, CardLoadError>` (après introduction du struct `Card`).
  - `filter_cards` : retourner `Result<Vec<Card>, CardFilterError>` si la structure JSON est invalide au lieu de renvoyer une liste vide.
- **Handlers** :
  - Récupérer `Result` des services ; mapper vers réponses HTTP (400/404/500) et corps JSON d’erreur structuré (ex. `{ "error": "code", "message": "..." }`).
- **Templates** :
  - `create_template()` et `get_template()` doivent retourner `Result<..., TemplateError>` ; le handler `index` doit gérer l’erreur et renvoyer 500 sans panic.
- **RAG** :
  - Remplacer `unwrap_or_default` / `unwrap_or_else` dans vector_store par une conversion qui retourne `Result` (ou au minimum logger et remonter une erreur si le payload est critique).
- **Mutex** :
  - Remplacer `vector_store.lock().unwrap()` par `vector_store.lock().map_err(...)?` et remonter une erreur HTTP 503 ou 500.

**Frontend (si logique migrée en Rust)** : les appels API pourraient retourner des codes et corps d’erreur typés ; côté TS, traiter `response.ok` et un body `{ error, message }` pour afficher des messages clairs.

---

## 4. Points de friction mémoire (Borrow Checker, données lourdes)

### 4.1 Structures lourdes et clones

| Élément | Usage actuel | Défi Borrow Checker / perf |
|--------|----------------|----------------------------|
| **assets/cards.json** | Chargé en entier en mémoire (`fs::read_to_string` + `serde_json::from_str`) dans `load_cards_from_file` et dans `reindex_all`. | Fichier très volumineux (~19M caractères) : une seule lecture par requête search et une par reindex. Éviter de garder plusieurs copies du JSON en mémoire ; préférer une seule lecture, parsing, puis libération. Pas de borrow checker direct, mais attention aux clones de `Value`. |
| **Vec<Value>** dans `filter_cards` | `.iter().filter(...).cloned().collect()` | Chaque carte est clonée. À terme : remplacer par `Vec<Card>` et éviter de cloner inutilement (iterer par référence si le handler peut consommer un buffer). |
| **VectorStore** | `Arc<Mutex<VectorStore>>` ; `VectorStore` contient `Qdrant` (client réseau) et `collection: String`. | Le borrow checker n’empêche pas le partage ; le `Mutex` est nécessaire car `upsert` prend `&mut self`. Risque de contention sur reindex (grosse écriture) vs search (lectures). |
| **EmbeddingService** | `Arc<Mutex<TextEmbedding>>` ; `embed_texts_immutable` prend `&self` puis lock interne. | Plus de concurrence sur les lectures ; le vrai mutex est sur le modèle. Pas de conflit borrow checker typique. |
| **Passage par référence** | `filter_cards(json: &Value, query: &str)` ; `reindex_all(cfg, embed, vs: &mut VectorStore)`. | `reindex_all` exige `&mut VectorStore` : dans `routes/rag.rs` on fait `&mut *vector_store.lock().unwrap()`, ce qui garde le lock pendant tout le reindex. Blocage long ; à documenter ou à découper en batches avec lock relâché entre chaque. |

### 4.2 Recommandations (alignées avec les décisions §8)

- **Search — cache en mémoire (décision 1)**  
  Mettre en place **dès maintenant** un cache immutable partagé : `OnceCell` ou `RwLock` d’un `Vec<Card>` (ou index) chargé au démarrage (ou à la première requête), avec **invalidation** après `/fetch_cards` (et optionnellement après reindex si le fichier local est mis à jour). Pattern Rust cible : partage immutable + invalidation contrôlée ; évite la dette perf sur tous les tests et mesures.
- **Reindex — règle + amélioration progressive (décision 3)**  
  **Court terme** : documenter la règle « reindex hors pic » et exposer un endpoint admin (ex. `/rag/reindex` réservé ou protégé) ; **moyen terme** : découper en batches avec lock relâché entre chaque batch, ou job worker dédié, pour permettre des recherches pendant un reindex. Apprentissage de la concurrence Rust par étapes, sans sur-ingénierie.
- **Réponses HTTP** : éviter de cloner de gros JSON ; préférer `serde_json::to_writer` ou équivalent pour streamer la réponse si la liste de cartes devient très grande.
- **Types typés** : remplacer `Value` par des structs permettra des emprunts (`&[Card]`) sans clone inutile quand c’est possible.

---

## 5. Invariants métier Yu-Gi-Oh (Type-Driven Design)

### 5.1 Règles à garantir par le système de types / validation

Extraction à partir du code actuel (TS + RAG + API YGOProDeck) :

| Règle | Où elle apparaît | Garantie Rust proposée |
|------|-------------------|-------------------------|
| **Deck : 40–60 cartes** | Front (affichage « deck-count ») ; pas de validation côté backend. | Type « deck validé » : `struct ValidatedDeck { entries: Vec<DeckEntry> }` avec constructeur ou `TryFrom` qui vérifie `total in 40..=60`. |
| **Max 3 copies par carte (par nom)** | Front : qty 1–3 dans le select ; pas de contrainte côté serveur. | Dans `ValidatedDeck` ou `DeckEntry` : somme des quantités par `card_id`/`name` ≤ 3. |
| **Quantité par ligne : 1, 2 ou 3** | `deck.ts` : options 1/2/3. | Type `Quantity(u8)` avec `TryFrom<u8>` ou enum restreint à 1..=3. |
| **Types de cartes** : Monster / Spell / Trap (et sous-types possibles) | `stats.ts` : `type.includes("monster")`, "spell", "trap" ; RAG : `card_type: String`. | Enum `CardType` (+ sous-types si nécessaire) ; désérialisation depuis l’API avec validation ou mapping par défaut. |
| **Niveau monstre** : 1–12 (si applicable) | Données API `level: Option<u8>`. | Newtype `Level(u8)` avec `TryFrom` ou assertion dans le constructeur (1..=12). |
| **ATK/DEF** : entiers (souvent ≥ 0 ; « ? » pour N/A) | RAG : `atk: Option<i32>`, `def: Option<i32>`. | Garder `Option<i32>` ; si besoin, type `AtkDef(i32)` avec validation ≥ 0 ou -1 pour « ? ». |
| **Recherche : minimum 4 caractères** | `handlers.rs` et `search.ts` | Garder la règle dans le handler ; optionnel : type `SearchQuery` avec méthode `validate()` retournant `Result<(), SearchError>`. |
| **Catégories deck** : liste fermée (Starter, Extender, …) | `category.ts` : `categoryOptions`, `CATEGORY_GROUPS`. | Enum `DeckCategory` ; à l’import/export deck, rejeter ou mapper les valeurs inconnues. |
| **Engine** : liste fermée (Engine 1, 2, 3, Staple, "") | `deck.ts` : options dans le select. | Enum `EngineKind` (+ valeur « aucun »). |

### 5.2 Modèles de domaine suggérés (sans code Rust final)

- **CardType** : enum avec variantes Monster / Spell / Trap (et éventuellement sous-variantes ou champ supplémentaire pour le sous-type texte).
- **DeckEntry** : nom ou id carte + quantité (1–3) + engine + catégories (Vec<DeckCategory>).
- **Deck** : liste d’entrées ; méthode ou `TryFrom` pour obtenir **ValidatedDeck** (40–60 cartes, max 3 par carte).
- **SearchQuery** : string avec contrainte « len >= 4 » (validée à la construction ou au parse de la requête).

Cela permet de faire échouer à la compilation ou à l’exécution (validation) dès qu’une règle est violée, au lieu de laisser le front seul appliquer des règles non garanties.

### 5.3 Règles deck côté serveur — déploiement progressif (décision 2)

- **Phase 1** : module de **validation pure** en Rust (pas de route obligatoire) — types `Deck`, `DeckEntry`, `ValidatedDeck`, `Quantity`, `DeckCategory`, `EngineKind` et fonctions `validate_deck(deck) -> Result<ValidatedDeck, DeckValidationError>`. Cœur Type-Driven Design, très formateur.
- **Phase 2** : exposition via API (import/export de deck avec validation), puis éventuellement stockage deck utilisateur. Réutiliser le même module de validation pour garantir les invariants 40–60 cartes et max 3 copies par carte.

---

## 6. Stratégie de test (parité ancien / nouveau)

### 6.1 État actuel

- **Rust** : tests unitaires (handlers, models, services), tests d’intégration (http_routes), tests RAG (fastembed, vector_store, integration, final_integration).
- **TypeScript** : tests Vitest (deck, api, category, main, search, stats, utils) en environnement jsdom.

### 6.2 Plan pour vérifier la parité de comportement

1. **Inventaire des comportements critiques**
   - Lister les cas métier : search (query < 4 chars → 400), search (query ≥ 4 → 200 + liste), fetch_cards → sauvegarde fichier, reindex → rapport indexed/skipped/errors, health RAG, import/export deck (format JSON), calcul probabilités (hypergeometric), comptes deck (monster/spell/trap).

2. **Tests de contrat API (Rust)**
   - Pour chaque route (/, /search, /fetch_cards, /rag/health, /rag/reindex, /rag/search) : tests d’intégration avec corps de réponse JSON structuré (schéma attendu) et codes HTTP.
   - Ajouter des tests sur les réponses d’erreur (query courte, fichier cards absent, etc.) une fois la stratégie `Result` en place.

3. **Tests de parité données**
   - Pour une même requête `/search?q=...`, comparer (dans un test dédié ou script) la structure et le nombre d’éléments entre l’ancienne réponse `Vec<Value>` et la nouvelle `Vec<CardSearchResult>` (après migration des types).
   - Snapshot ou golden file du premier élément de réponse pour détecter les régressions de champs.

4. **Tests front (TypeScript)**
   - Conserver les tests Vitest sur les fonctions pures (hypergeometric, getDeckGridRows, etc.).
   - Si une partie de la logique deck/validation est migrée en Rust : soit appeler l’API depuis les tests TS, soit dupliquer les cas en tests Rust (recommandé) pour la logique critique.

5. **Tests de non-régression RAG**
   - Après tout changement sur indexer/vector_store/embeddings : lancer la suite existante (fastembed, vector_store, integration, final_integration) et vérifier que le rapport d’indexation et les premiers résultats de recherche restent cohérents.

6. **CI**
   - Exécuter ensemble : `cargo test`, `npm test` (ou équivalent) dans le même pipeline ; optionnel : un test d’intégration E2E (navigateur ou API) qui enchaîne search + export deck et vérifie le JSON.

---

## 7. Synthèse des actions prioritaires (alignée avec les décisions §8)

- Introduire des **types métier** Rust (Card, CardType, DeckEntry, ValidatedDeck, SearchQuery, etc.) et réduire l’usage de `serde_json::Value` dans la couche métier.
- Remplacer **panic / expect / unwrap** par **Result** et types d’erreur dédiés (thiserror) ; propager jusqu’aux handlers et renvoyer des réponses HTTP et JSON d’erreur structurées.
- **Templates** : faire retourner `Result` par `create_template` / `get_template` et ne plus paniquer.
- **VectorStore / RAG** : traiter les cas de payload ou UUID invalides en erreur (ou log + valeur par défaut explicite) au lieu de `unwrap_or_default`.
- **Config** : envisager un type « config validée » (embed_batch dans une plage, etc.) après parsing.
- **Search — priorité** : mettre en place le **cache en mémoire** pour `/search` (partage immutable + invalidation après `/fetch_cards`) dès maintenant.
- **Deck** : ajouter un **module de validation pure** (Deck, ValidatedDeck, validate_deck) ; plus tard exposer via API import/export.
- **RAG reindex** : **court terme** — documenter « reindex hors pic » + endpoint admin ; **moyen terme** — batches + lock relâché entre chaque, ou job worker dédié.
- Ajouter des **tests de contrat** et de **parité** (réponses API, format deck) comme décrit en section 6.

---

## 8. Décisions prises (finalisées)

Les trois points suivants ont été tranchés et sont intégrés dans les sections 4.2, 5.3, 6 et 7.

| # | Sujet | Décision | Justification |
|---|--------|----------|----------------|
| **1** | **Perf recherche (`/search`)** | ✅ Oui, on optimise **dès maintenant** via cache en mémoire. | Apprentissage d’un excellent pattern Rust (partage immutable + invalidation) ; évite une dette perf qui impacte tous les tests et mesures. |
| **2** | **Règles deck côté serveur** | ✅ Oui, on les garantit en Rust, **progressivement** : d’abord un **module de validation pur** (pas forcément une route), puis plus tard exposition via API import/export. | Cœur « Type-Driven Design » et très formateur. |
| **3** | **RAG reindex et Mutex** | ✅ **Règle + amélioration technique légère** : **court terme** — documenter « reindex hors pic » + endpoint admin ; **moyen terme** — batch + lock relâché entre chaque, ou job worker dédié. | Apprentissage de la concurrence Rust par étapes, sans sur-ingénierie. |

---

## 9. Décisions par slice (migration analyzer-yugioh)

### Slice #5 — Routes / handlers (terminée)

- **Cache** : `CardCache` chargé au démarrage (`load_from_path`), passé en `web::Data` ; clone de l’`Arc` (via `cache_data.clone()`) dans la closure `HttpServer::new(move || ...)` pour chaque worker.
- **Route /search** : `GET /search` avec paramètre `q` extrait via `web::Query<SearchParams>` ; validation par `SearchQuery::new(...)?` ; erreurs mappées en HTTP via `impl ResponseError for AppError` (400 pour `Deck`/`SearchQuery`, 500 pour `CardCache`/`CardSearchResult`).
- **Réponse** : liste de cartes en JSON via DTO `SearchCardDto` (champs `name`, `type` compatibles front legacy).

### Slice #6 — Page d'accueil + intégration front (terminée)

- **Templates** : Tera avec `templates/**/*`, includes : header, generic-info, search-card, table-card, table-analysis.
- **Statiques** : `actix-files` sert `static/` sous `/static` ; front compilé avec **Vite** (`npm run build` → `static/dist/main.js`), HTML charge `/static/dist/main.js`.
- **DTO** : `SearchCardDto` pour `/search` avec `#[serde(rename = "type")]` et champs alignés sur le front legacy.
- **Erreurs template** : `TemplateError` avec `ResponseError` ; message d'erreur via `to_string()` (pas `{:?}` en prod).

### Phase 4 — Frontend (Vite, E2E, CSS)

- **Vite** : Build TS remplace `tsc` ; entrée `js/main.ts`, sortie `dist/main.js` (inchangée pour Tera). Vitest utilise la même config Vite pour les tests.
- **Playwright** : E2E dans `static/e2e/` ; 2 parcours (page charge zones deck ; panneau « Mes decks »). Option `webServer: cargo run` ou serveur déjà lancé avec `BASE_URL`.
- **CSS Modules / scoped** : **Non retenu.** Tera injecte des noms de classes en HTML ; le design system repose déjà sur BEM + tokens globaux. Les CSS Modules (classes générées à l’import) demanderaient un pipeline spécifique (manifest pour Tera) sans gain immédiat.

### Slice — Insights deck (Seventh Tachyon, front uniquement)

- **Emplacement** : logique pure sous `static/js/insights/` ; agrégateur `collectDeckInsights` ; règle isolée `seventhTachyon.ts` (extensible `kind` / `severity`).
- **Données** : snapshot aligné sur `getDeckState()` (`level` = rang Xyz côté API, numéro Number parsé sur le nom EN).
- **UI** : onglet header **SUGGESTIONS** (masqué si aucun insight), page dédiée avec tableaux ; rafraîchi depuis `computeGlobalStats()`. Navigation : `static/js/tabs.ts` (`setActiveTab`).

---

*Document finalisé avec ces décisions. À mettre à jour au fur et à mesure des changements de code et des évolutions (ex. mise en place du job worker RAG).*
