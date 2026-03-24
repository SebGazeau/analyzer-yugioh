# Probabilités de main — état actuel et évolutions possibles

Document de référence pour aligner le produit avec des modèles statistiques plus généraux (hypergéométrique multivariée, Monte Carlo, énumération exacte).

**Implémentation actuelle :** `static/js/stats.ts` (et tests `static/js/__tests__/stats.test.ts`).

---

## État actuel (résumé)

| Approche | Présent dans le projet ? | Détail |
|----------|---------------------------|--------|
| Hypergéométrique **univariée** | Oui | `hypergeometricDist`, `cumulativeHypergeometric`, `probabilityAtLeast` : une population `N`, un type de « succès » `K`, `n` tirages sans remise. |
| Hypergéométrique **multivariée** | Non | Les probas « au moins 1 carte dans la catégorie X » sont calculées **par catégorie** avec la loi univariée ; ce ne sont pas des lois **jointes** sur le vecteur de comptes (plusieurs types dans le même tirage). |
| Monte Carlo | Oui | `simulateDraw`, `simulateDrawCounts`, tirage UI (`drawOneCard`), histogrammes (ex. 1000 itérations) : échantillonnage sans remise sur un deck matérialisé carte par carte. |
| Énumération exacte (produit cartésien / récursion sur les mains) | Non | Pas de parcours exhaustif des \(\binom{N}{n}\) mains ; les valeurs exactes affichées viennent des **formules fermées** (coefficients binomiaux), pas d’une énumération algorithmique. |

---

## Pistes d’évolution future

### 1. Modèle multivarié (joint)

- **Objectif :** probabilités sur des événements qui mélangent plusieurs catégories ou plusieurs seuils en **un** tirage (ex. P(≥1 starter **et** ≥1 extender), distribution conjointe des comptes).
- **Piste :** loi hypergéométrique multivariée (urne à \(c\) couleurs, tirage de \(n\) cartes) ; calcul exact via multivariée ou, si trop lourd, Monte Carlo dédié avec estimateurs de variance.
- **Attention :** les catégories peuvent se **chevaucher** (une même carte dans plusieurs catégories) : le cadre « urne à couleurs disjointes » ne s’applique pas tel quel ; il faut soit des **strates** bien définies, soit rester sur la simulation / un graphe d’événements.

### 2. Énumération exacte par mains (optionnel)

- **Objectif :** exactitude maximale pour petits cas ou validation des formules / du MC.
- **Piste :** génération récursive des combinaisons de \(n\) cartes distinctes dans un deck de \(N\) slots (avec multiplicités par nom de carte), ou équivalent itératif ; coût exponentiel en la taille du deck pour une main complète → réservé à \(N, n\) modestes ou à des tests offline.
- **Usage typique :** tests de régression, comparaison MC vs exact sur un deck jouet.

### 3. Cohérence produit

- Si on ajoute du **multivarié** ou de l’**énumération**, documenter dans ce fichier les **invariants** (sans remise, main 5 vs 6, gestion des doublons de noms) et étendre **Vitest** avec des cas de référence (petits decks).

---

## Révision

À mettre à jour quand `stats.ts` (ou un module dérivé) intègre de nouveaux modèles.
