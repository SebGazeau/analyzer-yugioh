# Todolist — Rapprocher l’UI du style Duelist Lab (Builder + Analysis)

Objectif : faire tendre l’interface actuelle vers les captures de référence (Duelist Lab), **sans toucher au backend**, en travaillant template Tera + CSS + JS (data-* et tokens).

Référence : 3 captures (DECKS, BUILDER, ANALYSIS). Priorité : **Builder** et **Analysis**.

---

## 1. Refacto HTML / CSS / JS — Préparer les 3 interfaces (Decks | Builder | Analysis)

**Objectif :** Organiser le code pour que les trois “onglets/pages/interfaces” (Decks, Builder, Analysis) soient explicites dans la structure. Pas de changement du header actuel. Plus tard, la matrice de droits pourra cibler chaque interface de façon intuitive.

### 1.1 Structure HTML / Tera

- [ ] **1.1.1** Définir un conteneur par interface avec un attribut commun, ex. `data-page="decks"` | `data-page="builder"` | `data-page="analysis"` sur la section englobante (ou sur un wrapper dédié).
- [ ] **1.1.2** Découper `index.html` en includes clairs : par ex. `{% include "pages/decks.html" %}`, `{% include "pages/builder.html" %}`, `{% include "pages/analysis.html" %}` (créer `templates/pages/` si besoin). Chaque include = une seule interface.
- [ ] **1.1.3** S’assurer que tout le contenu “Mes decks” (liste, Rafraîchir) vit dans la section Decks ; la colonne recherche + zones + stats Builder dans la section Builder ; tout le bloc “Analyse des catégories” dans la section Analysis. Aucun mélange de responsabilité entre sections.

### 1.2 Structure CSS

- [ ] **1.2.1** Une feuille (ou un bloc) par interface : `.page-decks`, `.page-builder`, `.page-analysis` (ou sélecteurs `[data-page="decks"]` etc.). Les styles de chaque “page” sont scopés sous ce préfixe.
- [ ] **1.2.2** Fichiers existants à aligner : `dashboard.css` → découper ou renommer en `decks.css` / `builder.css` / `analysis.css` selon le contenu. `analysis.css` existe déjà ; vérifier que builder et “liste decks” ont chacun leur périmètre (ex. `builder.css` = colonnes builder, `decks.css` = grille/liste Mes decks).
- [ ] **1.2.3** Dans `main.css`, imports dans un ordre cohérent : tokens, reset, typo, composants, puis pages (decks, builder, analysis).

### 1.3 Structure JS

- [ ] **1.3.1** Modules ou fonctions d’init par interface : ex. `initDecks()`, `initBuilder()`, `initAnalysis()` (dans `static/js/init/` ou équivalent), appelées depuis `main.ts` au `DOMContentLoaded`. Chaque init ne s’occupe que des nœuds de sa section (sélecteurs sous `[data-page="…"]` ou IDs/classes dédiés).
- [ ] **1.3.2** Éviter les listeners globaux qui mélangent les rôles : ce qui relève de la liste des decks → dans initDecks ; recherche, grilles, stats en direct → initBuilder ; hero stats, composition, tableau analysis → initAnalysis.
- [ ] **1.3.3** Documenter (en commentaire ou petit README) la convention : “Decks = liste/sélection de decks ; Builder = construction du deck courant ; Analysis = stats et tableaux d’analyse”. Pour la matrice de droits plus tard : désactiver/masquer une interface = cibler la section + son init.

### 1.4 Contrats (data-* et stabilité)

- [ ] **1.4.1** Les sélecteurs JS utilisent des `data-*` (ex. `data-deck-action`, `data-builder="search-column"`) déjà en place ; ne pas les casser. Si de nouveaux blocs sont ajoutés, leur donner des `data-page="…"` ou `data-*` cohérents.
- [ ] **1.4.2** Après refacto : relancer les tests front (Vitest) et vérifier que les tests DOM existants passent (sélecteurs toujours valides).

**Fichiers concernés :** `templates/index.html`, création éventuelle de `templates/pages/decks.html`, `builder.html`, `analysis.html` ; `static/css/main.css`, `static/css/pages/dashboard.css` (ou decks.css), `builder.css`, `analysis.css` ; `static/js/main.ts`, `static/js/init/*.ts`.

---

## 2. Builder — Colonne gauche (recherche de cartes)

- [x] **2.1** Titre de bloc : “CARD SEARCH” (ou “Recherche de cartes” conservé), style en uppercase + petite typo, cohérent avec la ref.
- [x] **2.2** Champ de recherche : placeholder “Name, type, effect...” (ou équivalent FR), style input épuré (fond sombre, bordure subtile).
- [x] **2.3** Filtres type : 3 boutons **Monster** | **Spell** | **Trap** sous la recherche (état actif en accent doré/jaune).
- [x] **2.4** Liste de résultats : chaque ligne = initiale colorée (M bleu, S vert, T orange) + nom de la carte + type/sous-type (ex. “Tuner · 3★”) + bouton “+” à droite pour ajouter au deck.
- [x] **2.5** CSS : cartes de résultat en liste verticale, espacement lisible, couleurs par type (tokens existants ou nouveaux dans `tokens.css`).

**Fichiers :** `templates/components/search-card.html`, `static/css/pages/dashboard.css` ou `builder.css`, `static/js/search.ts` (rendu des lignes avec initiale + “+”).

---

## 3. Builder — Colonne centrale (deck courant)

- [x] **3.1** En haut de la colonne : **champ texte pour le nom du deck** (ex. “Dragon Rulers v3.2”) mis en avant (style input ou titre éditable).
- [x] **3.2** Réorganiser : placer “Mes decks” (liste + Rafraîchir) au-dessus ou dans un panneau repliable, pour laisser la place aux zones Main/Extra (et Side si on garde).
- [x] **3.3** **MAIN DECK** : titre + compteur “40 / 60” (ou x/60 dynamique), puis **grille de cartes** (placeholders avec bordure colorée par type, badge “x1”, “x2”, “x3” en bas à droite de chaque cellule).
- [x] **3.4** **EXTRA DECK** : idem, “14 / 15” (ou x/15), grille de placeholders.
- [x] **3.5** (Optionnel) Side Deck : soit même style en 3e bloc, soit garder le tableau actuel en dessous.
- [x] **3.6** Barre d’outils (Tout supprimer, Exporter, Importer, Sauvegarder, Mettre à jour) : regrouper en une ligne compacte ou sous le nom du deck, style secondaire (boutons outline/ghost).

**Fichiers :** `templates/index.html`, `templates/components/table-card.html`, `static/css/pages/dashboard.css` / `builder.css`, `static/js/deck.ts` / `stats.ts` (compteurs et rendu grille si on change la structure DOM).

---

## 4. Builder — Colonne droite (stats en direct)

- [x] **4.1** Bloc **OPENING HAND** : 3 lignes claires — “1st (5 cards)”, “2nd (6 cards)”, “Engine hit” avec pourcentages (builder-stats-first/second/engine), couleurs success/accent.
- [x] **4.2** Bloc **COMPOSITION** : Monsters / Spells / Traps avec compteurs et barres horizontales (builder-bar-monster/spell/trap), couleurs zone/main, success, amber.
- [x] **4.3** Bloc **CATEGORIES** : Bande `deck-stats-category-bar` + liste détaillée `builder-category-list` (label + count + barre par catégorie).
- [x] **4.4** Lien **Analyser →** (href="#analysis", scroll smooth) ; Sauvegarder reste dans la toolbar.

**Fichiers :** `templates/components/generic-info.html`, `static/css/pages/dashboard.css`, `static/js/stats.ts` (mise à jour des sélecteurs si nouveaux IDs/classes).

---

## 5. Analysis — En-tête et cartes de stats

- [x] **5.1** Titre : `#analysis-deck-name` + suffixe « Analyse des catégories » ; `setAnalysisDeckName(name)` appelé au chargement / reset du deck.
- [x] **5.2** Trois cartes hero : **1st hand** / **2nd hand** / **Engine hit** avec libellés “5-card opening”, “6-card opening”, “Starter in hand” ; style `.analysis-hero-card`, valeur en doré.
- [x] **5.3** Métrique Engine hit exposée (`#analysis-hero-engine` = P(≥1) première catégorie pour hand size courante).

**Fichiers :** `templates/pages/analysis.html`, `static/css/pages/analysis.css`, `static/js/stats.ts`, `static/js/deck.ts`.

---

## 6. Analysis — Composition et tableau

- [x] **6.1** Titre “Deck composition” au-dessus de `deck-composition-strip`.
- [x] **6.2** Tableau : colonnes **Catégorie** | **Count** | **% Deck** | **P(≥1 IN 5)** | ≥2 … ≥6.
- [x] **6.3** Pastille colorée (`.analysis-category-dot--*`) à gauche du nom ; **% Deck** en jaune (`.analysis-td-pct`), **P(≥1 IN 5)** en vert (`.analysis-td-prob5`).
- [x] **6.4** Style : fond `--color-bg-surface`, bordures, hover, typo.

**Fichiers :** `templates/components/table-analysis.html`, `static/css/pages/analysis.css`, `static/js/stats.ts`.

---

## 7. Cohérence visuelle globale

- [x] **7.1** Tokens : couleurs alpha (gold, danger) et `--radius-full` ajoutés dans `tokens.css` ; rgba remplacés par tokens dans les CSS.
- [x] **7.2** Espacements et bordures : `--space-*` et `--color-border-*` utilisés (dashboard, builder, analysis, auth, button, header).
- [x] **7.3** Typo : titres `--font-display`, chiffres `--font-mono`, corps `--font-body` ; `font-size` en dur remplacés par `--text-*` où pertinent.

---

## 8. Optionnel (plus tard)

- [x] **8.1** Vue “DECKS” dédiée : grille de cartes decks (image de fond, nom, tags 40/15, date) + carte “+ New Deck”, comme sur la capture “My Decks”. Peut rester une section ancrée sur la même page ou un bloc affiché en premier.
- [x] **8.2** Avatar utilisateur (initiales dans un cercle) à côté du pseudo dans le header.
- [x] **8.3** Raccourci “ANALYZE →” qui scroll vers la section Analysis et met l’onglet ANALYSIS actif.

---

## Ordre suggéré

1. **Refacto HTML/CSS/JS** (1.x) — trois interfaces explicites (Decks | Builder | Analysis), sans toucher au header. Préparation pour la suite et pour la matrice de droits.
2. **Builder droite** (4.x) — stats + boutons SAVE / ANALYZE (peu de changement de structure).
3. **Analysis** (5.x, 6.x) — cartes de stats + composition + tableau.
4. **Builder gauche** (2.x) — recherche + filtres + liste type Duelist Lab.
5. **Builder centre** (3.x) — nom du deck + grilles Main/Extra (éventuellement Side).

Travailler **un fichier à la fois**, relancer les tests front après chaque changement, et ne pas modifier le backend Rust.
