# Données requises par angle — « cartes associées »

Référence code : `static/js/associations/buildReport.ts`, `dynamicTextMentions.ts`, `associationFetchCache.ts`.  
API actuelle : `GET /associations/catalog`, `GET /associations/qa_related?card_id=`.

Le rapport combine une **ancre** (carte choisie) et un **catalogue** (liste de cartes scannées). La plupart des angles font un **balayage linéaire** du catalogue : réduire la taille du payload ou enrichir « à la demande » change ce qui est détectable.

---

## 1. Synthèse par angle

| `angleId` | Entrée **ancre** | Entrée **chaque carte du catalogue** | Appel séparé ? |
|-----------|------------------|--------------------------------------|----------------|
| `structured_archetype` | `archetype` (parsé) | `archetype` (parsé) | Non |
| `text_mention` (règles dynamiques + fixes) | `archetype`, `name`, `name_en` (construction des motifs) | Texte « citables » (voir §2) | Non |
| `text_mentions_anchor_name` | `name`, `name_en` | Texte citables **sans** `ygorg_name_en` (voir §2) | Non |
| `ygorg_official_qa` | `id` (passé à l’API) | Aucun (seulement les IDs retournés) | **Oui** — `/associations/qa_related` |
| Diagnostics (`YGORG_EFFECT_EN_AVAILABLE`, etc.) | — | Agrégat sur le catalogue | Non |

---

## 2. Champs texte « citables » (catalogue + ancre pour cohérence affichage)

Pour **`text_mention`** et le diagnostic **`NO_DESC_IN_CATALOG`**, le moteur utilise `associationCitableText(c)` :

- `desc` (YGOProDeck)
- `ygorg_effect_en`
- `ygorg_pendulum_effect_en`
- `ygorg_flavor_en`
- `ygorg_link_effect_en`
- `ygorg_name_en`

Pour **`text_mentions_anchor_name`** : `associationCitableTextForAnchorNameMatch(c)` — **même liste sauf** `ygorg_name_en` (évite faux positifs quand seul le nom officiel EN duplique le titre).

**Conséquence lazy** : enrichir **uniquement l’ancre** au clic n’améliore pas les angles « citation » tant que les **autres** cartes n’ont pas au moins un de ces champs rempli en base (ou dans le JSON chargé). Sans `desc` ni couches YGOrg sur le catalogue, ces angles restent vides ou partiels.

---

## 3. Champs minimal pour l’UI (hors logique de matching)

La modal affiche vignettes et noms : pour chaque `cardId` dans un groupe, il faut idéalement dans le catalogue (ou un cache) au minimum :

- `id`, `name`, `name_en` (déjà requis par `normalizeCatalogCard`)
- `image_url` (confort)

Les angles **ne dépendent pas** de `image_url` pour calculer les groupes.

---

## 4. Stratégies compatibles avec « moins d’appels massifs »

### A. Enrichissement lazy **côté serveur** au moment « associés »

- **Fort impact** : garantir pour l’**ancre** `id` que `card_enrichment_layers` / champs dérivés sont à jour (tu évites un gros batch global ; tu paies au clic).
- **Limite** : les angles `text_*` comparent l’ancre à **toutes** les cartes du catalogue chargé ; il faut soit :
  - garder un catalogue déjà enrichi en base (lecture seule rapide), soit
  - **changer de modèle** : endpoint qui ne renvoie pas tout le jeu mais un **sous-ensemble** (ex. IDs candidats par archétype + texte full-text côté DB) — évolution backend / contrat API.

### B. Catalogue client allégé + hydratation progressive

- Premier chargement : champs **légers** partout (`id`, `name`, `archetype`, pas de gros `desc`).
- **Problème** : avec le code actuel, `text_mention` / `text_mentions_anchor_name` **nécessitent** le texte sur chaque carte du tableau passé à `buildAssociationReport`. Il faudrait soit charger les textes par paquets (plusieurs fetch), soit déplacer le scoring **côté serveur**.

### C. Angle Q&A déjà « partiel »

- `ygorg_official_qa` ne scanne pas le catalogue : uniquement **`/associations/qa_related?card_id=`** + fusion avec les noms/images via le catalogue déjà en mémoire. Un enrichissement lazy ciblant les Q&A pourrait se brancher sur cette route sans toucher au scan texte global.

---

## 5. Décision produit suggérée (ordre de mise en œuvre)

1. **Lazy sur l’ancre** : utile pour fraîcheur **métadonnées** (archétype complété, image, nom EN) et pour toute future route « détail carte ».
2. **Conserver un catalogue lu depuis la DB** déjà alimenté par imports / jobs (comme aujourd’hui) pour que les angles texte et archétype restent **fiables** sans N requêtes utilisateur.
3. Si le volume `/associations/catalog` devient trop lourd : prioriser une **route serveur** « rapport associés pour `anchor_id` » qui lit le catalogue en SQL et ne renvoie au client que **groupes + métadonnées légères** — plutôt que d’enrichir 10k cartes une par une au clic.

---

## 6. Optimisations en place (perf perçue / transfert)

- **Compression gzip** : middleware Actix `Compress` sur l’app ; `fetch` navigateur envoie `Accept-Encoding: gzip` — le JSON `/associations/catalog` est nettement plus léger sur le fil.
- **Préchargement idle** : sur la page builder, `prefetchAssociationCatalogWhenIdle()` lance `getAssociationCatalog()` via `requestIdleCallback` (repli `setTimeout`) pour remplir le cache avant le premier clic « cartes associées ».

Évolutions possibles (plus lourdes) : endpoint « rapport » côté serveur, catalogue découpé ou champs réduits avec calcul texte en DB — voir §4–5.

## 7. Checklist « quels champs charger ? »

- **Seulement archétype / Q&A** : `archetype` partout + `qa_related` ; pas besoin des champs YGOrg longs si tu désactives les angles texte.
- **Angles texte actuels** : pour **chaque** carte du jeu présente dans le calcul, il faut au minimum ce que `associationCitableText` agrège (sinon diagnostic `NO_DESC_IN_CATALOG` ou groupes vides).
- **Affichage seul** : `id`, `name`, `image_url` suffisent pour les tuiles une fois les `cardIds` connus.

Ce document peut servir de base à une ADR ou à une évolution d’API ; toute rupture de contrat JSON doit rester alignée avec les tests Vitest sous `static/js/__tests__/associations/`.
