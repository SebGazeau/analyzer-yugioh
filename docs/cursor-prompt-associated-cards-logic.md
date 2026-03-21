# Prompt Cursor — logique métier « cartes associées » (multi-angles + validation)

Copier le bloc **Prompt principal** dans une conversation Cursor (avec `@static/js` et les types cartes pertinents).  
Objectif : **une seule pipeline** qui agrège des angles **complémentaires**, avec des **sorties séparées par type de lien** et un **espace de vérification** pour juger si le résultat est concluant.

---

## Contexte produit (rappel)

- Depuis une **carte présente dans le deck** (ou une carte « ancre »), l’utilisateur veut voir les cartes **associées dans tout le catalogue** disponible côté client (tableau en mémoire, cache recherche, ou liste chargée — **à aligner sur l’existant**).
- Si la carte a **plusieurs rattachements** (ex. *Regenesis* **et** *Archfiend*), les résultats doivent être **explicitement distingués** (sections / groupes séparés), sur l’esprit de [CardCluster — Regenesis Archfiend](https://cardcluster.com/card/regenesis-archfiend).
- Au-delà de l’archétype : distinguer **membre** d’un ensemble (donnée structurée) vs **référence partielle** (ex. texte qui cite « Yeux Bleus » / « Blue-Eyes » sans que la carte soit de cet archétype).

---

## Prompt principal (à coller dans Cursor)

```markdown
## Mission

Implémenter la **logique métier pure** (sans UI obligatoire dans un premier temps) pour un module **« cartes associées »** : à partir d’une carte **ancre** et d’un **catalogue** de cartes (toutes les cartes du jeu disponibles dans le processus), produire un **rapport structuré** regroupant les cartes liées selon **plusieurs angles complémentaires**, chacun dans son **propre groupe** avec métadonnées explicites.

## Contraintes

1. **Ne pas modifier le backend Rust** (`src/`) sauf si je demande explicitement une nouvelle route ou un champ ; réutiliser les champs déjà exposés au front (`name`, `type`, `race`, `desc`, `archetype`, etc.). Si `archetype` est une seule chaîne contenant plusieurs noms (ex. séparateurs « / », « | »), **normaliser** en tableau d’archétypes avec une fonction documentée + tests.
2. Fichiers cibles : sous `static/js/` (ex. `static/js/associations/` ou `static/js/cardAssociations.ts`) — cohérent avec l’arborescence actuelle.
3. **Aucune dépendance** nouvelle sauf nécessité absolue.
4. Exporter des fonctions **testables** sans DOM.

## Angles à implémenter (tous dans la même pipeline)

Chaque angle alimente **zéro, un ou plusieurs groupes** dans le rapport. Les libellés affichables (FR) sont dans le rapport pour faciliter une UI plus tard.

| ID angle | Description | Résultat attendu |
|----------|-------------|------------------|
| `structured_archetype` | Cartes du catalogue qui partagent **au moins un** archétype **structuré** avec l’ancre (champ archetype parsé). | **Un groupe par archétype** de l’ancre (ex. groupe « Regenesis », groupe « Archfiend »), pas une liste fusionnée. Exclure l’ancre elle-même des cibles ou la marquer à part selon une règle documentée. |
| `text_mention` | Cartes du catalogue dont la **description** (`desc`) contient une **expression** liée à un ensemble nommé, configurable via une **liste de synonymes** (ex. `Yeux Bleus`, `Blue-Eyes`, `青眼`). | Groupe(s) du type « Citations texte : … » avec `mentionKey` ; marquer explicitement `linkStrength: 'reference'` (pas membre d’archétype). |
| `text_mentions_anchor_name` (option v1) | Cartes dont le texte **cite le nom** de l’ancre (normalisation casse / ponctuation minimale). | Groupe séparé ; documenter les faux positifs possibles. |

**Complémentarité** : un même catalogue peut apparaître dans **plusieurs groupes** si pertinent ; le rapport doit éviter les **doublons au sein d’un même groupe** (dédoublonner par `id`).

## Modèle de données du rapport (à respecter ou équivalent documenté)

```ts
type LinkStrength = 'member' | 'reference';

type AssociationGroup = {
  angleId: string;           // ex. 'structured_archetype', 'text_mention'
  groupKey: string;          // ex. archetype name ou mentionKey — stable pour tests
  displayLabel: string;      // ex. "Même archétype : Regenesis"
  linkStrength: LinkStrength;
  cardIds: number[];         // ou objets légers { id, name } selon perf
  meta?: Record<string, unknown>; // ex. { synonymMatched: 'Blue-Eyes' }
};

type AssociationReport = {
  anchorId: number;
  anchorName: string;
  generatedAt: string;       // ISO
  groups: AssociationGroup[];
  diagnostics: Diagnostic[]; // voir ci-dessous
};

type Diagnostic = {
  code: string;              // ex. 'EMPTY_CATALOG', 'NO_ARCHETYPE_ON_ANCHOR', 'LARGE_GROUP_TRUNCATED'
  message: string;
  severity: 'info' | 'warn' | 'error';
};
```

## Règles de qualité / troncature

- Si un groupe dépasse **N** cartes (N configurable, ex. 200), **tronquer** et émettre un `Diagnostic` `LARGE_GROUP_TRUNCATED` avec le count total si calculable sans coût excessif.
- Si l’ancre n’a **aucun** archétype structuré : ne pas fabriquer de groupes vides pour cet angle ; `Diagnostic` `NO_ARCHETYPE_ON_ANCHOR` (info).

## Espace « résultat concluant » — obligatoire

Fournir **trois** moyens de vérifier que la logique tient la route :

1. **Tests Vitest** dans `static/js/__tests__/associations/` (ou chemin aligné projet) :
   - **Fixture ancre** « double archétype » : objet carte minimal avec `archetype` contenant deux noms → **exactement deux** groupes `structured_archetype` avec les bonnes `groupKey`.
   - **Fixture mention** : une carte dont `desc` contient un synonyme Yeux Bleus → apparaît dans un groupe `text_mention` avec `linkStrength: 'reference'`.
   - **Fixture négative** : catalogue sans carte partageant l’archétype → groupe vide absent ou diagnostic cohérent (selon règle choisie, documentée).
2. **Fonction de validation** `evaluateReportConclusiveness(report): { ok: boolean; reasons: string[] }` — critères explicites, ex. : « au moins un groupe non vide OU au moins un diagnostic explicatif si l’ancre ne permet aucun lien » ; utilisée dans les tests.
3. **Sortie lisible humain** : `associationReportToMarkdown(report): string` — markdown avec titres par groupe, nombre de cartes, premiers IDs/noms (ou échantillon), section **Diagnostics**. Permet de coller le résultat dans une issue ou de le lire dans la console en dev.

Commande : `cd static && npx vitest run` — tous les tests verts.

## Hors scope (sauf demande)

- UI / templates / `data-*`.
- Backend, SQL, index full-text serveur.
- Performance sur des dizaines de milliers de cartes (un simple commentaire TODO suffit en v1).

## Ordre de travail

1. Types + `buildAssociationReport(anchor, catalog, options)`.
2. Tests + `evaluateReportConclusiveness` + `associationReportToMarkdown`.
3. Branchement UI dans un second temps (non requis ici).

Après implémentation, résumer dans 5 lignes les **hypothèses** (parsing archétype, liste de synonymes) et les **limites** connues.
```

---

## Utilisation

- **Étape 1** : exécuter le prompt ci-dessus pour obtenir le module + tests + markdown + `evaluateReportConclusiveness`.
- **Étape 2** (autre message Cursor) : brancher le panneau UI et charger le catalogue comme le fait déjà l’app (search cache, endpoint existant, etc.).

## Métadonnées

- Fichier : `docs/cursor-prompt-associated-cards-logic.md`
- Dernière intention : logique **multi-angles**, **groupes séparés**, **validation** de la « conclusion » du rapport + **markdown** pour revue humaine.
