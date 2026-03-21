# Prompt Cursor — BO3 : 3 tirages carte par carte + side entre les manches

Copier le bloc **Prompt principal** dans une conversation Cursor avec  
`@static/js/stats.ts @static/js/init/simulation.ts @templates/pages/analysis.html @static/css/pages/analysis.css`.

---

## Prompt principal (à coller dans Cursor)

```markdown
## Mission

Étendre la **simulation de tirage** de la page Analyse pour proposer un **mode BO3** (jusqu’à **3 manches**) : sur chaque manche, l’utilisateur tire **carte par carte** sa main de départ comme aujourd’hui ; **entre la manche 1 et 2** puis **entre la manche 2 et 3**, une étape obligatoire lui permet de définir **quelles cartes il échange entre le Main et le Side** (side « à la main », comme en tournoi), puis la manche suivante repart d’un **Main mélangé à neuf** dérivé de cet état.

## Comportement attendu

### Flux utilisateur

1. **Manche 1** : tirage carte par carte jusqu’à `handSize` (5 ou 6, déjà géré via `setHandSize` / `getHandSize` dans `static/js/stats.ts`). Réutiliser l’esprit de l’UI actuelle (`btn-draw-one`, liste des cartes tirées, reset éventuel **uniquement** pour la manche en cours si tu le gardes).
2. **Side avant manche 2** : écran ou panneau où l’utilisateur :
   - choisit des cartes à **retirer du Main courant** (état après la manche 1 : le Main de départ du deck, pas « main de 5 cartes » — clarifier en UI : on side depuis le **deck principal 40–60**, pas depuis la main tirée) ;
   - choisit des cartes du **Side** à **mettre dans le Main** ;
   - nombre de cartes retirées du Main = nombre de cartes ajoutées depuis le Side (échange **équilibré**, règle Yu-Gi-Oh).
   - bouton **« Ne rien side »** : Main inchangé pour la manche 2.
3. **Manche 2** : nouveau mélange du Main **résultant** ; tirage carte par carte jusqu’à `handSize`.
4. **Side avant manche 3** : même logique que l’étape 2, à partir du Main **post–manche 2** (après side de l’étape précédente + logique à documenter : le Main de référence pour le side est toujours le **deck list** courant, pas les cartes déjà piochées — **à trancher explicitement** dans le code et l’UI).

### Règle de référence pour le side (à implémenter clairement)

**Décision produit obligatoire** (documenter dans un commentaire en tête du module ou dans `docs/decisions.md` en une phrase) :

- **Option A (recommandée pour la clarté)** : le side s’applique toujours au **Main du deck tel que listé dans le builder** (40–60 cartes), **indépendamment** des cartes déjà tirées dans la simulation. Les manches 2 et 3 simulent « si j’avais sided ainsi, quelle serait ma prochaine main » avec un Main **virtuel** = Main du deck après swaps.
- **Option B** : modéliser un Main « physique » réduit après les tirages — plus proche du tapis mais plus ambiguë pour le side (à éviter en v1 sauf spec détaillée).

Implémenter **Option A** sauf contrainte contraire de ma part.

### Contraintes légales (validation avant de passer à la manche suivante)

- Après chaque séquence de side : taille du Main **entre 40 et 60**, Side **≤ 15** cartes au total dans la liste side du deck, et **même nombre** de cartes sorties du Main et entrées depuis le Side.
- Messages d’erreur clairs si invalide ; pas de passage à la manche suivante tant que invalide (sauf « Ne rien side »).

### Technique

1. **Ne pas modifier le backend Rust** (`src/`) sauf demande explicite séparée.
2. Extraire ou compléter la logique dans `static/js/stats.ts` **ou** un module dédié `static/js/simulation/bo3.ts` importé par `stats.ts` / `init/simulation.ts` pour garder une **machine à états** lisible :  
   `phase: 'm1_draw' | 'side_1' | 'm2_draw' | 'side_2' | 'm3_draw' | 'done'`.
3. **Corriger** si besoin : dans `drawOneCard()`, la condition de fin doit utiliser **`handSize`** (via `getHandSize()`), pas un `5` en dur (bug potentiel actuel pour main à 6).
4. **Sélecteurs JS** : tout nouveau contrôle interactif utilise des attributs **`data-*`** (ex. `data-bo3-action`, `data-side-phase`). Les classes restent pour le style.
5. **CSS** : uniquement des **custom properties** de `static/css/tokens.css` ; pas de couleurs magiques.

### Données

- Lire le Main et le Side depuis **`getDeckState()`** (`static/js/deck.js` ou équivalent) : mêmes structures que le builder (noms, quantités, `imageUrl` si dispo).
- Pour le tirage : à chaque **début de manche**, construire un **pool pondéré** à partir du **Main virtuel** courant (après side), mélanger ou tirage aléatoire pondéré comme `drawOneCard` actuel (sans réutiliser les cartes déjà tirées **dans la manche** uniquement ; le deck complet se remélange entre les manches).

### UI (page Analyse)

- Ajouter un **mode** : « Tirage simple » (comportement actuel) vs « BO3 (3 manches + side) » — `data-simulation-mode` ou toggle.
- Indicateur de **manche** (1 / 2 / 3) et de **phase** (tirage / side).
- Panneau side : listes cliquables ou cases à cocher pour **retirer du Main** / **ajouter depuis le Side**, compteur « X ↔ X », boutons Valider / Annuler / Ne rien side.

### Tests (Vitest)

- Fonctions **pures** : `applySideSwap(mainLines, sideLines, removals, additions) → { main, side, error? }`, `validateBo3Side(...)`.
- Cas : side valide ; side invalide (tailles) ; « ne rien side » ; Main 40 min après swap.
- Pas obligatoire de tester le RNG ; mocker `Math.random` pour un tirage déterministe si utile.

### Commande de validation

`cd static && npx vitest run`

### Hors scope

- Simulation Monte Carlo sur 1000 BO3 d’affilée ; adversaire ; duel joué ; sauvegarde serveur du déroulé.

## Livrables

1. État BO3 + application side sur **Main virtuel** (Option A documentée).
2. UI Analyse avec toggle de mode et panneaux side.
3. Tests sur la logique de side et transitions de phase.
4. Une phrase dans `docs/decisions.md` : choix Option A/B et règle « main tirée vs deck list ».

Après implémentation, résumer les fichiers modifiés et comment revenir au tirage simple.
```

---

## Notes pour toi (hors prompt)

- **Fichiers actuels** : tirage dans `static/js/stats.ts` (`drawOneCard`, `drawnCards`, `resetDrawSimulation`) ; événements dans `static/js/init/simulation.ts`.
- **Incohérence** : `drawOneCard` utilise `drawnCards.length >= 5` alors que `handSize` peut être 6 — à aligner dans la même slice que le BO3.

## Métadonnées

- Fichier : `docs/cursor-prompt-bo3-hand-simulation.md`
