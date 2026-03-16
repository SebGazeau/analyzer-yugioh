# Plan de migration — Slices

## Slice #1 : Modélisation du Domaine (terminée)

**Objectif** : Introduire les types métier pour les cartes et le deck, sans `serde_json::Value` ni objets ouverts, en respectant les invariants Yu-Gi-Oh.

**Périmètre** :
- Types de cartes : `CardType`, éventuellement `CardFrameType`
- Modèle de carte : struct(s) pour recherche / RAG / deck (id, name, type, race, level, attribute, atk, def, etc.)
- Pas encore : routes, cache, RAG (slices suivantes)

**Contrat de sortie** :
- Module `domain` (ou `card` + `deck`) avec enums et structs typés
- Désérialisation depuis JSON API YGOProDeck (ou fixtures) avec validation
- Tests unitaires sur les types et la validation
- `docs/decisions.md` et `docs/architecture.md` à jour

**DoD** :
- [ ] Enums définis (CardType, etc.) avec sérialisation serde
- [ ] Struct(s) Card / CardSearchResult avec champs explicites
- [ ] Pas de `Value` dans la couche domaine
- [ ] rustfmt + clippy clean
- [ ] Note dans docs/decisions.md pour la Slice #1

---

## Slice #2 : Cache search (terminée)

**Objectif** : Éviter de recharger le fichier cartes à chaque requête `/search` : un cache en mémoire partagé, chargé une fois, invalidé après `/fetch_cards`.

**Périmètre** :
- Abstraction « cache de cartes » : structure qui tient `Vec<CardSearchResult>` (ou équivalent) en mémoire.
- Chargement initial : depuis un chemin fichier ou des données brutes (JSON → `RawCardSearchResult` → validation → `CardSearchResult`).
- Accès lecture : retourner une référence (ou clone) sur la liste pour la recherche (filtrage par nom, query ≥ 4 caractères).
- Invalidation : méthode pour vider / recharger le cache (appelée après `fetch_cards` ou reindex).
- Thread-safety : partage possible entre workers (ex. `RwLock<Vec<...>>` ou `OnceCell` + `RwLock`).

**Hors périmètre pour cette slice** :
- Routes HTTP et handlers (on peut les brancher après).
- RAG / Qdrant (reste en legacy ou slice ultérieure).

**Contrat de sortie** :
- Module `search` ou `cache` avec un type `CardCache` (ou nom équivalent) : `load(path)`, `get()`, `invalidate()` / `reload()`.
- Pas de `panic!` sur erreur de lecture ou de parsing : retourner `Result` avec erreur dédiée.
- Tests unitaires : cache vide, chargement, invalidation, partage lecture.

**DoD** :
- [ ] Type cache défini (RwLock/OnceCell + Vec\<CardSearchResult\> ou index).
- [ ] Chargement depuis fichier avec validation (Raw → CardSearchResult).
- [ ] Invariant « query minimum 4 caractères » possiblement encapsulé (ex. type `SearchQuery`).
- [ ] rustfmt + clippy clean.
- [ ] Note dans docs/decisions.md pour la Slice #2.

---

---

## Slice #3 : Validation deck (en cours)

**Objectif** : Garantir les invariants Yu-Gi-Oh sur les decks (main 40–60, extra/side 0–15, max 3 copies par carte).

**Déjà en place** :
- `Deck` avec `main_deck()`, `extra_deck()`, `side_deck()` (Result avec validation)
- `DeckError` (TooFewCards, TooManyCards, TooManyCopies)
- Règles : somme des quantités, max 3 par `card_name`
- Getters : `entries()`, `total_cards()`
- Test : `test_deck_main_deck` (40 cartes valides)

**À faire pour clôturer la slice** :
- [x] Tests pour cas invalides : main_deck trop court (< 40), trop long (> 60), TooManyCopies (une carte > 3)
- [x] Tests pour extra_deck et side_deck : valide (ex. 0 ou 15 cartes), invalide (> 15)
- [x] rustfmt + clippy OK (déjà fait)
- [ ] Note dans docs/decisions.md pour la Slice #3

---

---

## Slice #4 : Erreurs (en cours)

**Objectif** : Unifier la remontée d’erreurs dans le crate `analyzer-yugioh` (couche `shared/`) pour pouvoir les mapper proprement vers HTTP plus tard, sans multiplier les types d’erreur côté appelant.

**Constat** : On a déjà des erreurs dédiées par domaine (DeckError, CardSearchResultError, SearchQueryError, CardCacheError, etc.). Les handlers futurs devront les convertir en réponses HTTP (400, 404, 500) et en JSON.

**Périmètre (crate actuel uniquement, pas le legacy)** :
- Introduire un type d’erreur « racine » (ex. `AppError` ou `SharedError`) : enum qui englobe les erreurs des domaines (deck, card, search, cache).
- Implémenter `From<DeckError>` (et si utile `From<...>` pour les autres) vers ce type, pour pouvoir utiliser `?` et remonter une seule erreur.
- Optionnel : méthode sur ce type pour en déduire un code HTTP (ex. `fn status_code(&self) -> u16`) ou un message utilisateur, en vue des handlers.

**Hors périmètre** :
- Modifier le legacy (handlers, templates, RAG).
- Gestion des mutex / poison.

**Contrat de sortie** :
- Un module `error` (ou une section dans `shared`) avec l’enum d’erreur racine et les `impl From`.
- Pas de nouveau `panic!` / `expect` dans la lib (les tests peuvent garder `unwrap`).

**DoD** :
- [ ] Enum d’erreur racine définie avec variants par domaine (ou un variant « domaine » par type existant).
- [ ] `impl From` pour au moins 2 types d’erreur domaine (ex. DeckError, SearchQueryError).
- [ ] rustfmt + clippy OK.
- [ ] Note dans docs/decisions.md pour la Slice #4.

---

---

## Slice #5 : Branchement routes / handlers (terminée)

**Objectif** : Exposer la logique shared (cache, filtre, SearchQuery) via des routes HTTP dans le crate `analyzer-yugioh`, avec conversion des erreurs en réponses HTTP.

**Périmètre** :
- Démarrer un serveur Actix (ou équivalent) dans `main`.
- Au moins une route **GET /search?q=...** : valider la query (SearchQuery, sinon 400), lire le cache, filtrer, retourner du JSON (liste de cartes).
- État partagé : le `CardCache` doit être accessible dans les handlers (ex. `web::Data<CardCache>` ou équivalent).
- Erreurs : mapper `AppError` (ou erreurs domaine) vers codes HTTP (400, 500) et corps JSON structuré si possible.

**Hors périmètre pour cette slice** :
- Page d’accueil, templates, RAG, reindex.
- Legacy : on ne modifie pas le legacy, on fait vivre le nouveau serveur à côté.

**Contrat de sortie** :
- Le binaire lance un serveur avec une route `/search` utilisant cache + filtre.
- Query invalide (ex. &lt; 4 caractères) → 400.
- Pas de `panic!` dans les handlers : erreurs remontées en réponse HTTP.

**DoD** :
- [x] Serveur démarré dans `main` avec une route `/search`.
- [x] Handler qui utilise `SearchQuery`, `CardCache::get()`, `filter_cards`, et renvoie du JSON.
- [x] Cache injecté dans l’état de l’app (chargement au démarrage ou à la première requête).
- [x] Erreur de validation query → 400.
- [x] Note dans docs/decisions.md pour la Slice #5.

---

## Slice #6 : Page d’accueil + intégration front (terminée)

**Objectif** : Servir une page d’accueil (HTML) sur `GET /` à la place du simple "ok", pour préparer l’intégration du frontend (formulaire de recherche, appels à `/search`).

**Périmètre** :
- Remplacer la réponse "ok" de `GET /` par une page HTML (template Tera ou fichier HTML statique).
- Optionnel : servir les fichiers statiques (CSS/JS) sous `/static` pour que le front puisse être branché plus tard.
- Pas encore : logique RAG, reindex, fetch_cards dans le nouveau crate.

**Contrat de sortie** :
- `GET /` renvoie du HTML (page d’accueil avec titre, éventuellement champ recherche).
- Pas de `panic!` : chargement template / fichier en `Result`, erreur → 500 ou page d’erreur.

**DoD** :
- [ ] Page d’accueil HTML servie sur `/`.
- [x] Route `/static` pour assets (actix-files).
- [ ] rustfmt + clippy OK.
- [x] Note dans docs/decisions.md pour la Slice #6.

---

---

## Slice #7 : Validation deck API + tests HTTP (terminée)

**Objectif** : Exposer la validation deck via une API et ajouter des tests d'intégration HTTP.

**Réalisé** :
- **POST /validate_deck** : accepte un JSON `{ main, extra, side }` (format export frontend), retourne `{ valid, errors, main_count, extra_count, side_count }`
- Règles Yu-Gi-Oh : main 40–60, extra/side 0–15, max 3 copies par carte
- Tests HTTP : `tests/http_integration.rs` (index, count, search, card, validate_deck)
- Refactor : `src/lib.rs`, `src/handlers.rs`, `src/app.rs` pour permettre les tests

**DoD** :
- [x] Route POST /validate_deck
- [x] Tests d'intégration HTTP (8 tests)
- [x] rustfmt + clippy OK

---

## Persistance decks (API + front)

**Réalisé** :
- API : POST/GET/GET:id/PUT/DELETE `/decks` (pool optionnel → 503 si absent)
- Front : bouton « Sauvegarder sur le serveur », section « Mes decks » (liste, Rafraîchir, Charger)
- Tests HTTP : 5 tests (sans pool → 503)
- docs/todo.md §4 coché

---

*Slices suivantes : RAG / legacy, fetch_cards, reindex, Shuttle.*
