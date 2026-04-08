# Charte graphique — analyzer-yugioh

Document de référence aligné sur le **code** (`static/css/tokens.css`, `typography.css`, feuilles `components/` et `pages/`). En cas d’écart, le CSS du dépôt fait foi.

---

## Thème

- **Mode** : thème sombre par défaut (`:root` et `[data-theme="dark"]` dans `tokens.css`).
- **Ambiance** : fond très sombre, surfaces surélevées, **accent or** (`--color-gold`) réservé aux actions fortes et à la navigation active.

---

## Couleurs

### Fonds

| Token | Valeur | Usage |
|--------|--------|--------|
| `--color-bg-base` | `#0d0f14` | Fond de page |
| `--color-bg-surface` | `#151820` | Panneaux, cartes, header |
| `--color-bg-elevated` | `#1e2130` | Modales, survols, en-têtes dégradés |
| `--color-bg-sunken` | `#0a0c10` | Champs, zones enfoncées, pistes scrollbar |
| `--color-bg-control-scrim` | `rgba(21, 24, 32, 0.82)` | Contrôles au-dessus d’illustrations |

### Bordures

| Token | Valeur | Usage |
|--------|--------|--------|
| `--color-border-subtle` | `#2a2d3a` | Séparateurs discrets |
| `--color-border-strong` | `#3d4155` | Bordures visibles, focus de base |
| `--color-border-accent` | `#c9a227` | Accent or (bordures fortes, filets modale) |

### Texte

| Token | Valeur | Usage |
|--------|--------|--------|
| `--color-text-primary` | `#e8eaf0` | Titres, libellés actifs |
| `--color-text-secondary` | `#8b90a8` | Corps, descriptions |
| `--color-text-muted` | `#5a5f78` | Désactivé, placeholders |
| `--color-text-inverse` | `#0d0f14` | Texte sur fond clair / or |

### Marque & sémantique

| Token | Rôle |
|--------|------|
| `--color-gold`, `--color-gold-dim`, `--color-amber` | Marque, CTA, onglets actifs |
| `--color-danger` (+ `-bg`, bordures alpha) | Erreur, suppression |
| `--color-success` (+ `-bg`) | Succès |
| `--color-info` (+ `-bg`) | Infos (ex. type primaire fiche carte) |
| `--color-warning` (+ `-bg`) | Avertissement |

Variantes **or en transparence** : `--color-gold-alpha-06` … `--color-gold-alpha-30` (boutons, survols).

**Focus clavier** : `--focus-ring-gold` (ombre type ring).

### Zones deck (builder)

| Token | Couleur | Zone |
|--------|---------|------|
| `--color-zone-main` | `#4a6fa5` | Main |
| `--color-zone-extra` | `#8b5cf6` | Extra |
| `--color-zone-side` | `#3dba7a` | Side |

---

## Typographie

Chargement des polices : **`typography.css`** (Google Fonts).

| Rôle | Token | Famille | Poids (Google) |
|------|--------|---------|----------------|
| Affichage | `--font-display` | Rajdhani | 400–700 |
| Interface / corps | `--font-body` | Lato | 300, 400, 700 |
| Chiffres / stats | `--font-mono` | IBM Plex Mono | 400, 500 |

### Échelle de taille (`--text-*`)

| Token | Taille |
|--------|--------|
| `--text-xs` | 11px |
| `--text-sm` | 12px |
| `--text-base` | 14px |
| `--text-md` | 16px |
| `--text-lg` | 18px |
| `--text-xl` | 22px |
| `--text-2xl` | 28px |

**Usages typiques dans le projet** : boutons `.btn` en Rajdhani uppercase ; descriptions de cartes en Lato petit corps ; compteurs / probabilités en mono si le contexte l’exige.

---

## Espacements (`--space-*`)

Base **4px**.

| Token | Valeur |
|--------|--------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

Préférer ces variables aux pixels bruts pour rester cohérent.

---

## Rayons, ombres, z-index, mouvement

### Rayons (`--radius-*`)

- `--radius-sm` 3px · `--radius-md` 6px · `--radius-lg` 8px · `--radius-xl` 12px · `--radius-full` 50%

### Ombres

- `--shadow-sm` · `--shadow-md` · `--shadow-lg` (noirs semi-transparents)

### Z-index

- `--z-base` 1 · `--z-above` 10 · `--z-overlay` 100 · `--z-modal` 200 · `--z-toast` 300

### Transitions

- `--duration-fast` 100ms · `--duration-normal` 160ms · `--duration-slow` 260ms  
- `--ease-default` : `cubic-bezier(0.16, 1, 0.3, 1)`

---

## Fichiers CSS (organisation)

Import global : **`static/css/main.css`** (ordre des `@import`).

| Fichier | Rôle |
|---------|------|
| `tokens.css` | Design tokens |
| `reset.css` | Reset minimal |
| `typography.css` | Fonts + redéfinition des `--font-*` |
| `components/scrollbar.css` | Scrollbars thémées |
| `components/button.css` | Boutons `.btn` et variantes |
| `components/header.css` | Header, onglets, auth |
| `components/associations-modal.css` | Modale « cartes associées » |
| `components/card-art-banner.css` | Bannière illustration (panoramique + masque) |
| `pages/auth.css` | Pages auth |
| `pages/dashboard.css` | Builder deck, recherche, popover carte, badges fiche, etc. |
| `pages/decks.css` | Liste / édition decks |
| `pages/builder.css` | Layout 3 colonnes builder |
| `pages/analysis.css` | Analyse |
| `pages/suggestions.css` | Suggestions |

---

## Composants UI réutilisables (CSS)

### Boutons — `components/button.css`

- Base : `.btn` (hauteur 34px, Rajdhani, uppercase, `--radius-md`).
- Variantes : `.btn--primary` · `.btn--secondary` · `.btn--ghost` · `.btn--danger` · `.btn--icon`
- Tailles : `.btn--sm` · `.btn--lg` · `.btn--block`

### Header & navigation — `components/header.css`

- `.header`, `.header-brand`, `.header-tabs`, `.app-tab`, `.app-tab--active`, `.header-auth`
- Onglet actif : texte or + bordure inférieure or (3px).

### Scrollbars — `components/scrollbar.css`

- Scrollbar fine, piste `--color-bg-sunken`, thumb `--color-border-strong`, hover/active liés au thème.

### Modale associations — `components/associations-modal.css`

- `.associations-modal`, `__backdrop`, `__panel` (bord gauche accent or), `__header`, etc.
- Panneau centré, `max-height` viewport, ombre `--shadow-lg`.

### Bannière illustration carte — `components/card-art-banner.css`

- `.card-art-banner` (+ `--compact`, `--hero`, `--spell`, `--trap`)
- Usage TS : `static/js/components/cardArtBanner.ts` (`buildCardArtBannerHtml`).
- Règle projet : `.cursor/rules/card-art-banner.mdc`

### Patterns forts dans `pages/dashboard.css` (non exhaustif)

- **Recadrage illustration** (petit format) : `.card-art-crop` + `.card-art-crop__img`
- **Aperçu recherche flottant** : `#search-card-float`, `.search-card-preview`, `.search-card-preview__*` (fiche : hero art, nom, types, badges, desc)
- **Popover édition carte** : `.deck-card-popover`, `.deck-card-popover-hero`, `.deck-card-popover-card-desc`, etc.
- **Badges stats fiche** : `.card-fiche-badge`, `.card-fiche-badge--stat`
- **Sections deck** : `.deck-section`, `.deck-section-title`, grille de cellules deck
- **Jetons / catégories** (popover) : `.chip`, `.chips-categories`, `.dropdown-list` (voir aussi règles dans le même fichier)

### Builder — `pages/builder.css`

- `.page-builder`, `.deck-builder-layout` (grille 3 colonnes), `.deck-builder-search`, sections repliables `.deck-section--collapsed`, etc.

---

## Intégration de nouveaux écrans

1. Réutiliser les **tokens** (`--color-*`, `--space-*`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*`).
2. Préférer un fichier dédié sous `static/css/pages/` ou `static/css/components/` et l’**importer** dans `main.css`.
3. Côté JS : modules dans `static/js/`, échappement HTML via `escapeHtml` / `escapeAttr` si chaînes injectées.
4. Pour une bannière « Master Duel-like » sur une fiche : voir **card-art-banner** ; pour une vignette dans une grille : **card-art-crop**.

---

*Dernière mise à jour : dérivée de `tokens.css` et de l’arborescence CSS du dépôt.*
