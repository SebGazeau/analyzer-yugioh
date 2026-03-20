# Prompts Cursor — insights « pont » (deck / analyse)

Chaque section est un **prompt autonome** à coller dans Cursor (éventuellement avec `@static/js @static/css @templates`).  
**Contraintes communes** (sauf mention contraire) :

- Ne pas modifier le **backend Rust** (`src/`, routes, SQL) sans demande explicite séparée.
- Sélecteurs JS : attributs **`data-*`** ; CSS : **tokens** de `static/css/tokens.css` uniquement.
- Logique pure **testée** (`npx vitest run` dans `static/`) avant ou avec l’UI.
- S’intégrer au **même pipeline** d’insights que les autres règles (`collectDeckInsights`, `kind`, `severity`).

---

## 1. Seventh Tachyon

```markdown
## Objectif

Implémenter une règle d’insight **Seventh Tachyon** dans l’agrégateur d’insights du deck.

### Règle de jeu (v1 deck-building)

- Si le deck contient la magie **Seventh Tachyon** et l’Extra Deck au moins un monstre Xyz « Number » dont le **numéro est entre 101 et 107** :
  - Pour chaque tel Xyz dans l’Extra, calculer les **monstres du Main Deck** qui peuvent être **ajoutés à la main** : même **Type** OU même **Attribut** que le monstre révélé, **Niveau** = **Rang** du Xyz.
- Si ST est présent mais aucun Numéro 101–107 dans l’Extra : insight **court** (pas de liste de cibles).
- Si pas de ST : **aucun** insight pour cette règle.

### Livrables

- Module dédié ex. `static/js/insights/seventhTachyon.ts` + tests `__tests__/insights/seventhTachyon.test.ts`.
- Brancher sur `collectDeckInsights` avec `kind: 'seventh_tachyon'`.
- UI : panneau suggestions (résumé + détail dépliable), `data-*` pour le JS.

### Données

Utiliser les champs cartes déjà disponibles ; documenter toute **heuristique** (ex. parsing « Number 101 ») dans le code et les tests.

### Hors scope

Autres cartes ; synergies « si tu ajoutais ST » sans ST dans le deck.
```

---

## 2. Fusion Deployment

```markdown
## Objectif

Ajouter une règle d’insight pour **Fusion Deployment** (texte TCG en vigueur — **vérifier la carte** avant de coder : effets peuvent varier selon errata / région).

### Intention produit

Aider le joueur à voir **quels monstres du Main Deck** peuvent être concernés lorsqu’il joue cette carte, **en fonction** des **Monstres Fusion** déclarés dans son Extra Deck (et des propriétés exposées par ta base : Types des matériels mentionnés sur la carte Fusion, noms, etc.).

### Étapes obligatoires avant implémentation

1. **Citer** dans un commentaire ou `docs/decisions.md` le **texte exact** de la carte utilisé comme référence (date / locale).
2. Lister les **champs JSON / structs** disponibles pour : cartes Fusion, matériels, Type, nom.

### Comportement attendu (à adapter au texte réel)

- Si le deck ne contient **pas** Fusion Deployment : aucun insight pour cette règle.
- Si la carte est présente mais l’Extra n’a **aucune** Fusion exploitable avec les données dont tu disposes : message **explicite** (« données insuffisantes » ou « aucune Fusion analysable »).
- Sinon : regrouper par Fusion pertinent ou par Type, avec **résumé** + **détail dépliable**.

### Tests

Fixtures avec 1–2 Fusions dont les matériels sont connus ; cas vide ; cas sans la magie dans le deck.

### kind suggéré

`kind: 'fusion_deployment'`, `severity: 'active'` quand la magie est dans le deck.
```

---

## 3. Small World

```markdown
## Objectif

Ajouter une règle d’insight pour **Small World** (monstre A en main → chercher un monstre « entre » A et B selon les critères officiels ATK/DEF/Type/Attribut/Niveau).

### Avertissement

**Complexité élevée** : combinatoire, nombreuses cartes, risque de faux positifs. Prévoir une **v1 réduite** ou un mode **« approximatif »** désactivable.

### v1 recommandée (choisir une option et la documenter)

**Option A — Pédagogique uniquement** : si Small World est dans le deck, afficher un **encart texte** qui résume la mécanique + lien vers une référence externe ; **pas** de calcul exhaustif.

**Option B — Calcul limité** : pour **deux** monstres du Main (sélectionnés par l’utilisateur via `data-*` + UI) ou pour une **petite liste** (ex. main deck monsters du deck courant, plafonnée à N pour perf), calculer les **candidats « middle »** valides selon les règles Konami.

### Livrables

- `kind: 'small_world'`.
- Tests unitaires sur des **triplets** A — middle — B connus (fixtures), et cas impossibles.
- Si Option B : limite de perf documentée, pas de blocage UI sur deck 60+ sans debounce / Web Worker si nécessaire.

### Hors scope v1

Recherche optimale « meilleur chemin » pour la main de départ ; prise en compte des effets qui modifient ATK/DEF sur le terrain.
```

---

## 4. Nadir Servant / Dogmatika (Extra → ajout)

```markdown
## Objectif

Ajouter une ou plusieurs règles d’insight pour **Nadir Servant** et, si pertinent, les cartes **Dogmatika** qui **envoient un Monstre Fusion depuis l’Extra Deck** pour activer / déclencher un effet d’ajout depuis le Deck.

### Avant codage

1. Lister précisément les cartes couvertes (ex. Nadir seul en v1).
2. Pour **chaque** carte : paraphrase **fidèle** du déclencheur et de la résolution (envoi depuis Extra, restrictions, « add 1 … »).

### Comportement type

- Si la carte supportée est **dans le deck** :
  - Vérifier la présence de **Monstres Fusion** (ou sous-ensemble défini) dans l’Extra.
  - Si oui : suggestion du type « avec [tel Fusion] dans l’Extra, tu peux… » + liste des **cibles d’ajout** si ton modèle de données permet de les dériver (sinon message partiel honnête).

### kind / structure

`kind: 'nadir_servant'` ou `kind: 'dogmatika_extra_send'` ; séparer une règle par carte si les textes divergent fortement.

### Tests

Deck avec Nadir + Extra vide ; Nadir + 1 Fusion connue ; sans Nadir → pas d’insight.

### Précaution

Respecter les **noms exacts** des archétypes / types de monstres mentionnés sur la carte (Albaz, etc.) selon ta source de données.
```

---

## 5. Shaddoll Fusion

```markdown
## Objectif

Ajouter un insight **pédagogique / conditionnel** pour **Shaddoll Fusion**, sans simuler une partie complète.

### Rappel

L’usage des monstres du **Deck comme Matériels** dépend d’une **condition de jeu** (souvent : l’adversaire contrôle un monstre Invoqué Spécialement depuis l’Extra Deck). Une app **deck-only** ne peut pas savoir si la condition sera vraie.

### Comportement attendu

- Si le deck contient **Shaddoll Fusion** :
  - Afficher une **note courte** : quand la condition est remplie, quels **Shaddoll** (ou monstres listés comme matériels sur tes Fusions Shaddoll dans l’Extra) sont typiquement concernés — **sans** affirmer que le deck est « jouable » ce tour.
  - Optionnel : liste des **Fusions Shaddoll** présentes dans l’Extra et des **types de matériels** requis si les données le permettent.

### kind suggéré

`kind: 'shaddoll_fusion'`, `severity: 'info'` (pas `active` au sens « toujours résolu »).

### Tests

Présence / absence de la magie ; présence d’Extra Shaddoll / absence.

### Hors scope

Simulation adversaire ; validation « légal ce tour ».
```

---

## 6. Cartes « moteur » simples (Trade-In, Allure, Prosperity, Extravagance, One for One, Unexpected Dai)

```markdown
## Objectif

Ajouter un **module d’insights à faible complexité** pour plusieurs cartes staples : une règle **par carte** ou un fichier `engineStaples.ts` avec sous-fonctions, chacune avec `kind` distinct.

### Règles types (adapter au texte officiel de chaque carte)

| Carte (exemple)        | Idée de suggestion |
|------------------------|--------------------|
| **Trade-In**           | Nombre de monstres **Niveau 8** dans le main (ou « pas assez pour justifier 3 copies »). |
| **Allure of Darkness** | Présence de monstres **TÉNÈBRES** ; avertissement si < 1 cible banishable. |
| **Pot of Prosperity**  | Taille de l’Extra / cartes bannissables selon ton interprétation deck-building. |
| **Pot of Extravagance**| Idem (différence de contrainte — respecter le texte). |
| **One for One**        | Présence de monstres **Niveau 1** (deck + extra si pertinent pour la chaîne). |
| **Unexpected Dai**     | Présence de **monstres Normaux** sans effet de **Niveau 4 ou moins** dans le deck. |

### Comportement commun

- Si la carte **n’est pas** dans le deck : **aucun** insight pour cette sous-règle.
- Messages **courts** + option « détail » (liste des IDs/noms qui comptent comme cibles).
- `severity: 'info'` ou `'warning'` si le deck joue 3 copies de la carte sans cibles suffisantes.

### Tests

Un fichier de test par carte **ou** un fichier paramétré avec table de cas ; minimum 2 cas par carte (OK / KO).

### kind suggérés

`kind: 'trade_in'`, `allure_of_darkness`, `pot_of_prosperity`, `pot_of_extravagance`, `one_for_one`, `unexpected_dai`.

### Hors scope v1

Calcul de probabilité de pioche ; main de départ.
```

---

## Ordre d’exécution recommandé dans le projet

1. **Seventh Tachyon** (référence + pipeline insights).  
2. **Cartes moteur simples** (rapide, habitue les utilisateurs au panneau).  
3. **Fusion Deployment** ou **Dogmatika / Nadir** (moyen, dépend des champs carte).  
4. **Shaddoll Fusion** (info, peu de risque).  
5. **Small World** en dernier ou en mode pédagogique seulement.

---

## Métadonnées du document

- **Fichier** : `docs/cursor-prompts-insights-bridge.md`  
- **Usage** : copier-coller la section voulue (bloc ```markdown … ```) dans une conversation Cursor ; ajuster chemins (`static/js/…`) si l’arborescence change.
