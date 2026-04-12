# Roadmap produit et technique — document consolidé

Ce fichier regroupe les **idées produit**, les **pistes stats / RAG**, le **backlog DB & infra** et une **lecture de l’état du code** (dernière revue : avril 2026). Les détails d’implémentation très longs restent dans les docs pointées en fin de section.

**Légende d’état (code)** : **Fait** · **Partiel** · **Non** · **N/A** (hors code)

---

## Sommaire

1. [Tableau synthèse — idées vs code](#1-tableau-synthèse--idées-vs-code)
2. [Idées de fonctionnalités (YGO DECK MANAGER)](#2-idées-de-fonctionnalités-ygo-deck-manager)
3. [Probabilités de main — modèles](#3-probabilités-de-main--modèles)
4. [Recherche sémantique / RAG](#4-recherche-sémantique--rag)
5. [Backlog technique (DB, CI, Konami)](#5-backlog-technique-db-ci-konami)
6. [Associations — note d’évolution](#6-associations--note-dévolution)
7. [Architecture & migrations (références)](#7-architecture--migrations-références)

---

## 1. Tableau synthèse — idées vs code

| Idée (voir §2) | État code | Indices |
|----------------|-----------|---------|
| §1 Prix / Cardmarket | **Partiel** | Données `card_sets` / `set_price` en base ; pas d’UI deck total ni liens Cardmarket systématiques. |
| §2 Probas carte précise | **Non** | Probas par **catégorie** + histogrammes (`static/js/analysis/probabilityMath.ts`). |
| §3 Stats type / attribut / niveau | **Fait** | `static/js/analysis/compositionBreakdown.ts` + panneaux via `stats.ts` (monstres : attribut, niveau, race ; sorts/pièges par sous-type). |
| §4 Simulateur « nouvelle main » | **Partiel** | `drawOneCard`, 1000 sims ; pas de bouton « main complète » + vignettes comme décrit. |
| §5 Tags menu contextuel | **Non** | Catégories via popover uniquement. |
| §6 Filtres recherche avancés | **Non** | `src/shared/search/filter.rs` : nom FR/EN ; filtres simples côté UI. |
| §7 Extensions / sets (fiche) | **Partiel** | Données en DB ; pas la fiche « Extensions (n) » décrite. |
| §8 Import / export .ydk | **Partiel** | `importDeckFromYDK` / `exportDeckToYDK` dans `static/js/deck-state.ts` ; **UI** : import/export **JSON** (`deck.ts`). |
| §9 DnD recherche → deck | **Non** | DnD **intra-grille** Main/Extra/Side (`deckDragDrop.ts`). |
| §10 Cartes associées | **Fait** | Module `static/js/associations/`, API `src/modules/associations/`. |
| §11 Accordéons composition | **Fait** | Builder (`builder-composition-accordion`), zones deck, tableau Analysis repliable. |

**Priorisation historique** (inchangée, §2 fin de document) : à réévaluer selon §1.

---

## 2. Idées de fonctionnalités (YGO DECK MANAGER)

Document de référence pour des évolutions possibles. Analyse initiale : captures d’un concurrent (YGO DECK MANAGER).

> **Note §3 / §11** : la doc d’origine disait que la vue « structure du deck » et les accordéons manquaient ; avec l’état actuel du code, ces points sont **largement couverts** (voir tableau §1).

### 1. Prix / Cardmarket

- **Valeur totale du deck** (Main + Extra, en €) dans le header ou la zone deck.
- **Prix par carte** (ex. 0,20 €) + lien Cardmarket sur la fiche carte.
- Optionnel : filtre recherche par fourchette de prix (min/max €).

**Intérêt :** budget et comparaison de builds.

---

### 2. Probabilités pour une carte précise

- Quand une carte est **sélectionnée** (recherche ou dans le deck) : bloc **« Probabilités (main 5/6) »** pour **cette carte** uniquement.
- Afficher **P(0 ex.)**, **P(1 ex.)**, **P(2+ ex.)** en main d’ouverture (5 ou 6 cartes), avec petites barres ou %.

**À la différence de l’existant :** on a déjà les probs par **catégorie** et la simu 1000 tirages ; pas la proba « une carte donnée en main ».

---

### 3. Stats détaillées du deck (par type / attribut / niveau)

- Section ou modale **« Statistiques du deck »** avec par exemple :
  - **Par type** : Effect, Spell, Trap, Tuner, Link, Fusion, etc. (barres horizontales).
  - **Par attribut** : LIGHT, DARK, FIRE, etc.
  - **Par niveau / rang / link** : répartition Lv1, Lv2, Lv4, etc.

**Évolution produit possible :** affiner le découpage « type de monstre » (Fusion / Link / …) au-delà des agrégats actuels si les données le permettent.

---

### 4. Simulateur de main dédié

- Bouton **« Nouvelle main »** : pioche une **main complète** (5 ou 6 cartes) d’un coup.
- Affichage des **cartes en main** (grandes vignettes) + **« +1 Piocher »** pour piocher une carte supplémentaire.
- Texte **« X cartes en main, Y dans le deck »**.
- **Probabilités par catégorie** pour la main actuelle (ex. Starters, Hand Traps) avec barres colorées / %.

**À la différence de l’existant :** on a « Tirer une carte » (une par une) + « Run 1000 sims » (histogrammes). Pas de « une main entière + voir les cartes + probs catégories sur cette main ».

---

### 5. Tags rapides (menu contextuel sur une carte du deck)

- **Clic droit** (ou équivalent) sur une carte **dans le deck** → menu avec tags prédéfinis : **Starter**, **Hand Trap**, **Extender**, **Staple**, **Brick**, **Favori**, etc., avec **pastille de couleur**.
- Option **« Retirer tous les tags »**.

**À la différence de l’existant :** on a les catégories dans **« Modifier la carte »** ; le plus serait la **rapidité** (pas besoin d’ouvrir le popover à chaque fois).

---

### 6. Filtres de recherche avancés

En plus du filtre actuel (Tous / Monster / Spell / Trap) et du champ texte :

- **Type de carte** : Normal, Ritual, Fusion, Synchro, Xyz, Link, Pendulum, etc.
- **Attribut** (LIGHT, DARK, FIRE, etc.).
- **Type de monstre** (Magicien, Dragon, etc.).
- **Niveau / Rang / Link** (min–max).
- **ATK / DEF** (min–max).
- **Banlist** (TCG / OCG, autorisé / limité / interdit).
- **Tri** (nom, type, prix, etc.).

**Contrainte :** dépend du backend (API de recherche) et des données disponibles.

---

### 7. Extensions / sets pour une carte

- Dans la fiche d’une carte : **« Extensions (4) »** avec nom du set, code rareté (C, R, etc.) et éventuellement prix dans ce set.

**Intérêt :** plutôt orienté collection / prix.

---

### 8. Import / export .ydk

- **Import .ydk** : charger un deck depuis un fichier .ydk (compatibilité EDOPro, autres logiciels).
- Optionnel : **Export .ydk** pour réutiliser le deck ailleurs.

**Intérêt :** interopérabilité et adoption.

---

### 9. Drag-and-drop pour le deck

- Glisser-déposer une carte depuis les **résultats de recherche** vers Main / Extra / Side (en plus ou à la place des boutons + et Side).

**Intérêt :** confort de build, surtout sur desktop.

---

### 10. Cartes associées

- Sur la **fiche carte** ou un panneau latéral : afficher les **cartes associées** (liens officiels / données API : même archétype, cartes citées dans le texte, matériaux de fusion / synchro / xyz / link, support, etc. — selon ce que l’API ou la base locale expose).
- Permettre d’**ajouter au deck** ou d’**ouvrir la recherche** sur une carte associée en un clic.

**Intérêt :** compléter un deck sans quitter le builder ; proche de ce que montrent certains outils concurrents sur la fiche carte.

**Contrainte :** dépend du modèle de données (ex. champs YGOProDeck `misc_info`, relations archétype, parsing du texte d’effet si besoin).

---

### 11. Accordéons sur la composition

- Dans le panneau **composition / stats** : replier ou déplier des blocs (type, attribut, catégories, etc.) pour **alléger l’écran** tout en gardant le détail accessible.

**Intérêt :** lisibilité sur petits écrans et réduction du scroll.

---

### Synthèse priorisée (historique)

| Priorité | Fonctionnalité | Intérêt |
|----------|----------------|--------|
| **Haute** | Probabilités pour une carte précise | Lien direct avec les questions « calculs / lisibilité ». |
| **Haute** | Simulateur de main (main complète + affichage cartes + probs catégories) | Complète le « Run 1000 sims » et rend la simu plus lisible. |
| **Haute** | Stats par type / attribut / niveau | Vue « structure du deck » — **réalisée en grande partie** (voir §1). |
| **Moyenne** | Tags rapides (menu contextuel) | Accélère le tagging sans changer le modèle de catégories. |
| **Moyenne** | Import .ydk (au moins import) | Interopérabilité — **logique présente, branchement UI à faire**. |
| **Moyenne** | Prix / Cardmarket (total + par carte) | Très demandé par les joueurs. |
| **Basse** | Filtres de recherche avancés | Très utile mais dépend de l’API. |
| **Basse** | Drag-and-drop deck | Confort UX. |
| **Basse** | Extensions / sets | Intéressant si dimension « collection ». |
| **Moyenne** | Cartes associées (fiche / panneau + ajout rapide) | **Livré** (modal + API). |
| **Basse** | Accordéons sur la composition | **Livré** (builder + analysis). |

*À réviser selon l’évolution du produit et du backend.*

---

## 3. Probabilités de main — modèles

Document de référence pour aligner le produit avec des modèles statistiques plus généraux (hypergéométrique multivariée, Monte Carlo, énumération exacte).

**Implémentation actuelle :** `static/js/stats.ts`, `static/js/analysis/probabilityMath.js` (et tests associés).

### État actuel (résumé)

| Approche | Présent dans le projet ? | Détail |
|----------|---------------------------|--------|
| Hypergéométrique **univariée** | Oui | `hypergeometricDist`, `cumulativeHypergeometric`, `probabilityAtLeast` : une population `N`, un type de « succès » `K`, `n` tirages sans remise. |
| Hypergéométrique **multivariée** | Non | Les probas « au moins 1 carte dans la catégorie X » sont calculées **par catégorie** avec la loi univariée ; ce ne sont pas des lois **jointes** sur le vecteur de comptes (plusieurs types dans le même tirage). |
| Monte Carlo | Oui | `simulateDraw`, `simulateDrawCounts`, tirage UI (`drawOneCard`), histogrammes (ex. 1000 itérations) : échantillonnage sans remise sur un deck matérialisé carte par carte. |
| Énumération exacte (produit cartésien / récursion sur les mains) | Non | Pas de parcours exhaustif des \(\binom{N}{n}\) mains ; les valeurs exactes affichées viennent des **formules fermées** (coefficients binomiaux), pas d’une énumération algorithmique. |

### Pistes d’évolution future

#### 1. Modèle multivarié (joint)

- **Objectif :** probabilités sur des événements qui mélangent plusieurs catégories ou plusieurs seuils en **un** tirage (ex. P(≥1 starter **et** ≥1 extender), distribution conjointe des comptes).
- **Piste :** loi hypergéométrique multivariée (urne à \(c\) couleurs, tirage de \(n\) cartes) ; calcul exact via multivariée ou, si trop lourd, Monte Carlo dédié avec estimateurs de variance.
- **Attention :** les catégories peuvent se **chevaucher** (une même carte dans plusieurs catégories) : le cadre « urne à couleurs disjointes » ne s’applique pas tel quel ; il faut soit des **strates** bien définies, soit rester sur la simulation / un graphe d’événements.

#### 2. Énumération exacte par mains (optionnel)

- **Objectif :** exactitude maximale pour petits cas ou validation des formules / du MC.
- **Piste :** génération récursive des combinaisons de \(n\) cartes distinctes dans un deck de \(N\) slots (avec multiplicités par nom de carte), ou équivalent itératif ; coût exponentiel en la taille du deck pour une main complète → réservé à \(N, n\) modestes ou à des tests offline.
- **Usage typique :** tests de régression, comparaison MC vs exact sur un deck jouet.

#### 3. Cohérence produit

- Si on ajoute du **multivarié** ou de l’**énumération**, documenter ici les **invariants** (sans remise, main 5 vs 6, gestion des doublons de noms) et étendre **Vitest** avec des cas de référence (petits decks).

**Révision :** à mettre à jour quand `stats.ts` (ou un module dérivé) intègre de nouveaux modèles.

---

## 4. Recherche sémantique / RAG

### ADR (résumé)

**Contexte :** le dossier `legacy/` contient une implémentation **Qdrant + FastEmbed** (routes `/rag/*`) **non portée** dans le binaire actuel.

**Décision :** découpage en **slices** (cadrage → modèle → données → embeddings → index → CLI reindex → HTTP → front optionnel → ops), pièges et radar techno détaillés dans **[`rag-semantic-search-slices.md`](rag-semantic-search-slices.md)**. L’entrée complète dans [`decisions.md`](decisions.md) : section « ADR — Plan futur : recherche sémantique / RAG ».

**État code :** **Non** dans `src/` actuel (recherche lexicale `GET /search` = référence).

### Rappel des pièges legacy (à ne pas reproduire)

1. ID vectoriel instable (UUID aléatoire par reindex) → préférer **passcode** stable.
2. `Arc<Mutex<VectorStore>>` dans handlers async → patterns non bloquants / client cloneable.
3. Source `cards.json` seule → aligner sur **Postgres** + cache comme le reste de l’app.
4. Typage lâche → `thiserror` / structs.
5. Routes RAG sans auth → **admin / feature-flag / rate limit** dans le racine.

### Ordre d’exécution prévu (synthèse)

Slices **0 → 1 → 2 → 3 → 4 → 5 → 6** ; **7–8** (front, observabilité) en parallèle ou après. Détail : **`rag-semantic-search-slices.md`**.

---

## 5. Backlog technique (DB, CI, Konami)

Intègre et **corrige** l’ancien suivi « todo » (DB / CI / Konami) par rapport au code observé en avril 2026.

### 1. Brancher l’app sur la base

- [x] `sqlx` + `DATABASE_URL`, pool, chargement `cards` → `CardCache`, pool optionnel, comportement si table vide.

### 2. `/fetch_cards` et persistance

**Avec `DATABASE_URL` et pool :** `GET /admin/fetch_cards` appelle `fetch_cards_with_pool` → `cards_sync::sync_from_ygoprodeck` → upsert DB + rechargement cache (`src/modules/admin_sync/service.rs`). Les cases « écrire en base » sont **largement remplies** pour ce chemin.

**Sans pool :** fallback fichier `cards.json` + rechargement cache.

**Reste éventuel (affinage) :** alignement exhaustif structs / schéma (`card_desc`, ENUMs) — voir aussi §3 ci-dessous.

### 3. Aligner le modèle Rust avec le schéma v4

- [ ] Struct(s) / mapping API → DB au plus près du schéma (champs optionnels, ENUMs).
- [ ] Optionnel : getters / `Serialize` unifiés pour API et DB.

### 4. Decks persistés

- [x] API CRUD `/decks`, front sauvegarde / chargement, tests HTTP.
- [x] Lien compte : les decks sont filtrés par **`site_user_id`** (`src/modules/decks/repository.rs`) — l’ancienne mention « `user_id` NULL sans auth » est **dépassée** pour le flux connecté.

### 5. Auth site

- [x] `site_users`, sessions, routes register/login/logout, tests d’intégration de base.

### 6. CI / GCP

- [ ] **Artifact Analysis** sur l’image Artifact Registry ([doc Google](https://cloud.google.com/artifact-analysis/docs), voir `docs/ci-integration.md`).

### 7. Konami (catalogue officiel)

- [x] `konami_catalog_snapshots` + `konami-pack-index`.
- [ ] Job optionnel **cartes par pack**.
- [ ] Retirer `yugioh_cardlist_scraper/` quand couverture Rust + DB jugée suffisante.

---

## 6. Associations — note d’évolution

Les **cartes associées** sont implémentées (modal, catalogue, angles). Pour les **évolutions** (lazy ancre, allègement catalogue, endpoint « rapport » serveur, champs citables), la référence détaillée reste **[`associations-data-by-angle.md`](associations-data-by-angle.md)** (données par angle, gzip, prefetch idle).

**Piste rappelée :** enrichissement lazy sur l’ancre aide métadonnées / future fiche carte ; les angles « texte » exigent un catalogue enrichi ou un changement de modèle (calcul côté serveur).

---

## 7. Architecture & migrations (références)

Ces documents ne sont **pas** fusionnés ici (trop longs / toujours utilisés en isolation) :

| Document | Rôle |
|----------|------|
| [`migration_plan.md`](migration_plan.md) | Slices de migration domaine / historique |
| [`sync-pipeline-jobs.md`](sync-pipeline-jobs.md) | Cible **job** (sync cartes) vs serveur HTTP |
| [`reorganisation-backend-compte-rendu.md`](reorganisation-backend-compte-rendu.md) | Découpage `src/modules/`, `db/`, compte rendu |
| [`decisions.md`](decisions.md) | ADR (dont RAG, gzip `Compress`, frontières HTTP) |

**Déjà en prod côté HTTP :** compression gzip via `actix_web::middleware::Compress` (`src/app.rs`).

---

*Document consolidé : une seule entrée pour roadmap produit + backlog ; mettre à jour le tableau §1 lors des livraisons majeures.*
