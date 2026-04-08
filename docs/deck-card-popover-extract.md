# Extract — Popover « Modifier la carte » (deck builder)

> Fichier de référence unique : HTML (shell + exemple résolu), CSS, TypeScript du popover, widget catégories et plafonds quantité.  
> **Généré à partir du dépôt** — pour une version à jour, resynchroniser depuis les chemins indiqués.

## Dépendances non recopiées ici

`deckCardPopover.ts` s’appuie encore sur :

| Rôle | Fichiers |
|------|----------|
| Bannière illustration | `static/js/components/cardArtBanner.ts` |
| Badges ATK/DEF/niveau | `static/js/cardFicheBadges.ts` |
| API description | `static/js/api.ts` (`fetchCardByName`) |
| Modal associations | `static/js/associations/modal.js`, `modalController.js` |
| Grille deck | `static/js/deck-builder/grid/deckGridDomSelectors.ts` |
| Utilitaires | `static/js/utils/*` (aria, css, dom events, html, keyboard, numberParse) |
| Tokens / layout global | `static/css/tokens.css`, styles `btn-deck`, `--z-modal`, etc. |

---

## 1. HTML — shell TypeScript (`DECK_CARD_POPOVER_SHELL_HTML`)

Source : `static/js/deck-builder/card-edit-popover/deckCardPopoverShell.ts`  
(Les classes / textes viennent des modules listés en section 3.)

### Exemple résolu (structure équivalente, 3 options qty si max = 3)

```html
<div class="deck-card-popover-inner">
  <h4 class="deck-card-popover-title deck-card-popover-title--sr-only">Modifier la carte</h4>
  <div class="deck-card-popover-banner-mount" data-deck-popover-art-banner=""></div>
  <div class="deck-card-popover-main">
    <div class="deck-card-popover-col deck-card-popover-col--text">
      <p class="deck-card-popover-card-name" data-deck-popover-name=""></p>
      <p class="deck-card-popover-type-primary" data-deck-popover-type-primary=""></p>
      <p class="deck-card-popover-type-secondary" data-deck-popover-type-secondary=""></p>
      <div class="deck-card-popover-badge-row" data-deck-popover-badges=""></div>
      <p class="deck-card-popover-card-desc" data-deck-popover-desc=""></p>
    </div>
    <div class="deck-card-popover-col deck-card-popover-col--deck">
      <p class="deck-card-popover-settings-heading">Dans ton deck</p>
      <div class="deck-card-popover-row">
        <label class="deck-card-popover-field-label" for="deck-card-popover-qty">Quantité</label>
        <select id="deck-card-popover-qty" class="deck-card-popover-qty" aria-label="Quantité" title="Quantité">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>
      <div class="deck-card-popover-row">
        <label class="deck-card-popover-field-label" for="deck-card-popover-engine">Engine</label>
        <select id="deck-card-popover-engine" class="deck-card-popover-engine" aria-label="Engine" title="Engine">
          <option value="">-</option>
          <option value="Engine 1">Engine 1</option>
          <option value="Engine 2">Engine 2</option>
          <option value="Engine 3">Engine 3</option>
          <option value="Staple">Staple</option>
        </select>
      </div>
      <div class="deck-card-popover-row deck-card-popover-cats">
        <label class="deck-card-popover-field-label deck-card-popover-field-label--stack">
          Catégories
          <div class="deck-card-popover-cat-container"></div>
        </label>
      </div>
    </div>
  </div>
  <div class="deck-card-popover-actions">
    <!-- 4 boutons icône : fermer, supprimer, couverture, associées — voir deckCardPopoverShell.ts -->
  </div>
</div>
```

**Racines montées par JS** (hors inner) :

- `div.deck-card-popover-backdrop` (`data-deck-popover-backdrop="1"`)
- `div.deck-card-popover` (`role="dialog"`, `aria-modal="true"`, `aria-label="Modifier la carte"`)

---

## 2. CSS

Source : `static/css/pages/dashboard.css` (extraits contigus ; `.card-art-crop` est partagé avec la recherche).

```css
/* Fond assombri : clic = fermer + enregistrer (comme Fermer) */
.deck-card-popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal) - 1);
  background: var(--color-bg-base);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--duration-fast), visibility var(--duration-fast);
}
.deck-card-popover-backdrop--open {
  opacity: 0.55;
  visibility: visible;
  pointer-events: auto;
}

.card-art-crop {
  overflow: hidden;
  position: relative;
}
.card-art-crop__img,
.card-art-crop .search-card-preview__hero-img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 104px;
  object-fit: cover;
  object-position: center 72%;
  transform: scale(1.12);
  transform-origin: center center;
}

/* Popover édition carte ─────────────────────────── */
.deck-card-popover {
  position: fixed;
  z-index: var(--z-modal);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-3);
  min-width: 280px;
  max-width: 460px;
  max-height: calc(100vh - 2 * var(--deck-card-popover-vp-margin, 16px));
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  visibility: hidden;
  opacity: 0;
  transition: opacity var(--duration-fast), visibility var(--duration-fast);
}
.deck-card-popover--open {
  visibility: visible;
  opacity: 1;
}

.deck-card-popover-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.deck-card-popover-banner-mount {
  min-height: 0;
}
.deck-card-popover .deck-card-popover__art-banner {
  --card-art-banner-h: clamp(56px, 10vw, 96px);
  margin: calc(-1 * var(--space-3)) calc(-1 * var(--space-3)) var(--space-2);
  width: calc(100% + 2 * var(--space-3));
  max-width: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  overflow: hidden;
}

.deck-card-popover-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 40%);
  gap: var(--space-3);
  align-items: start;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
}
.deck-card-popover-col--text {
  min-width: 0;
  min-height: 0;
  max-height: min(280px, 48vh);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.deck-card-popover-col--deck {
  min-width: 0;
  overflow: visible;
  padding-left: var(--space-2);
  border-left: 1px solid var(--color-border-subtle);
}
.deck-card-popover-col--deck .deck-card-popover-settings-heading {
  margin-bottom: var(--space-2);
}
.deck-card-popover-col--deck > .deck-card-popover-row + .deck-card-popover-row {
  margin-top: var(--space-2);
}
.deck-card-popover-card-desc {
  margin: var(--space-1) 0 0;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  line-height: 1.45;
  white-space: pre-wrap;
  max-height: min(120px, 26vh);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: var(--space-1);
}
.deck-card-popover-card-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.deck-card-popover-type-primary {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-info);
}
.deck-card-popover-type-secondary {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}
.deck-card-popover-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.deck-card-popover-title {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-gold);
  margin: 0 0 var(--space-1);
  letter-spacing: 0.02em;
}
.deck-card-popover-title--sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.deck-card-popover-settings-heading {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.deck-card-popover-field-label {
  display: block;
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
  cursor: pointer;
}
.deck-card-popover-field-label--stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
  cursor: default;
}
.deck-card-popover-field-label--stack .deck-card-popover-cat-container {
  width: 100%;
  min-width: 0;
}
.deck-card-popover-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.deck-card-popover-row select {
  width: 100%;
  height: 30px;
  padding: 0 var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  background: var(--color-bg-sunken);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}
.deck-card-popover-row select:focus {
  outline: none;
  border-color: var(--color-gold-dim);
  box-shadow: var(--focus-ring-gold);
}
.deck-card-popover-qty--limit-0 option[value="1"],
.deck-card-popover-qty--limit-0 option[value="2"],
.deck-card-popover-qty--limit-0 option[value="3"],
.deck-card-popover-qty--limit-1 option[value="2"],
.deck-card-popover-qty--limit-1 option[value="3"],
.deck-card-popover-qty--limit-2 option[value="3"] {
  color: var(--color-danger);
}
.deck-card-popover-cat-container .category-container {
  position: relative;
  min-height: 30px;
  width: 100%;
}
.deck-card-popover-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: 0;
  padding-top: var(--space-2);
  border-top: none;
  align-items: center;
  justify-content: center;
}

.deck-card-popover-icon-btn.btn-deck {
  padding: 0;
}
.deck-card-popover-icon-btn {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  min-width: 42px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}

.deck-card-popover-icon-btn .deck-card-popover-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  pointer-events: none;
}

.card-fiche-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-text-primary);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}
.card-fiche-badge--stat {
  color: var(--color-info);
  font-variant-numeric: tabular-nums;
}

.deck-card-popover .chips-categories {
  border: 1px solid var(--color-border-strong);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-sunken);
  border-radius: var(--radius-sm);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  min-height: 30px;
  max-width: 100%;
  cursor: pointer;
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}
.deck-card-popover .chips-categories__placeholder {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  user-select: none;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
}
.deck-card-popover .chips-categories:focus-within {
  border-color: var(--color-gold-dim);
  box-shadow: var(--focus-ring-gold);
}
.deck-card-popover .chip {
  background: var(--color-gold-alpha-20);
  color: var(--color-gold);
  border: 1px solid var(--color-gold-dim);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}
.deck-card-popover .chip button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font-size: var(--text-base);
  line-height: 1;
  color: var(--color-text-muted);
  transition: color var(--duration-fast);
}
.deck-card-popover .chip button:hover {
  color: var(--color-danger);
}
.deck-card-popover .dropdown-arrow {
  margin-left: auto;
  padding: 0 var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  user-select: none;
  flex-shrink: 0;
}
.deck-card-popover .dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--space-1);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
  display: none;
  flex-direction: column;
}
.deck-card-popover .dropdown-list.show {
  display: flex;
}
.deck-card-popover .dropdown-list div {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--duration-fast);
}
.deck-card-popover .dropdown-list div:hover {
  background: var(--color-bg-elevated);
}
.deck-card-popover .dropdown-list .dropdown-list__empty {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  cursor: default;
}
.deck-card-popover .dropdown-list .dropdown-list__empty:hover {
  background: var(--color-bg-surface);
}

.dropdown-list.dropdown-list--floating {
  position: fixed;
  margin-top: 0;
  left: auto;
  right: auto;
  top: auto;
  width: auto;
  z-index: calc(var(--z-modal) + 25);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow-y: auto;
  display: none;
  flex-direction: column;
  box-sizing: border-box;
}
.dropdown-list.dropdown-list--floating.show {
  display: flex;
}
.dropdown-list.dropdown-list--floating div {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--duration-fast);
}
.dropdown-list.dropdown-list--floating div:hover {
  background: var(--color-bg-elevated);
}
.dropdown-list.dropdown-list--floating .dropdown-list__empty {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  cursor: default;
}
.dropdown-list.dropdown-list--floating .dropdown-list__empty:hover {
  background: var(--color-bg-surface);
}
```

---

## 3. TypeScript / JavaScript

### 3.1 `deckConstants.ts` (extraits utilisés par le popover)

```ts
export const DECK_DEFAULT_MAX_COPIES_PER_CARD = 3;
export const DECK_DEFAULT_ROW_QUANTITY = 1;
export const DECK_CARD_POPOVER_GAP_PX = 4;
export const DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX = 16;
```

### 3.2 `deckCardEditDialogCopy.ts`

```ts
export const DECK_CARD_EDIT_DIALOG_TITLE = 'Modifier la carte';
```

### 3.3 `deckCardPopoverActionTitlesCopy.ts`

```ts
import { DECK_CARD_EDIT_DIALOG_TITLE } from './deckCardEditDialogCopy.js';

export const DECK_CARD_POPOVER_HEADING_TEXT = DECK_CARD_EDIT_DIALOG_TITLE;

export const DECK_CARD_POPOVER_CLOSE_BTN_TITLE = 'Enregistrer les modifications et fermer';
export const DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL = 'Enregistrer et fermer';
export const DECK_CARD_POPOVER_DELETE_BTN_TITLE = 'Supprimer cette ligne du deck';
export const DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL = 'Supprimer la carte du deck';
export const DECK_CARD_POPOVER_COVER_BTN_TITLE =
    'Définir cette carte comme couverture du deck (liste Mes decks)';
export const DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL = 'Définir comme couverture du deck';
export const DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE = 'Ouvrir le rapport des cartes associées pour cette carte';
export const DECK_CARD_POPOVER_ASSOCIATED_BTN_ARIA_LABEL = 'Cartes associées';
```

### 3.4 `deckCardPopoverFormCopy.ts`

```ts
import { DECK_DEFAULT_MAX_COPIES_PER_CARD } from '../deckConstants.js';

export const DECK_CARD_POPOVER_LABEL_QTY = 'Quantité';
export const DECK_CARD_POPOVER_LABEL_ENGINE = 'Engine';
export const DECK_CARD_POPOVER_LABEL_CATEGORIES = 'Catégories';

export const DECK_CARD_POPOVER_CATEGORIES_PLACEHOLDER =
    'Cliquer pour choisir des rôles (Starter, Extender, Hand Trap…)';

export const DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL = 'Dans ton deck';
export const DECK_CARD_POPOVER_DESC_EMPTY_LABEL = 'Texte non disponible';
export const DECK_CARD_POPOVER_ENGINE_OPTION_EMPTY_LABEL = '-';
export const DECK_CARD_POPOVER_ENGINE_CHOICES = ['Engine 1', 'Engine 2', 'Engine 3', 'Staple'] as const;
export const DECK_CARD_POPOVER_SHELL_QTY_OPTION_COUNT = DECK_DEFAULT_MAX_COPIES_PER_CARD;
```

### 3.5 `deckCardPopoverIconsHtml.ts`

```ts
export const DECK_CARD_POPOVER_ICON_SVG_ATTRS =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const DECK_CARD_POPOVER_SVG_PATH_CLOSE_D = 'M18 6L6 18M6 6l12 12';

const DECK_CARD_POPOVER_SVG_DELETE_PATH_DS = [
    'M3 6h18',
    'M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2',
    'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
    'M10 11v6M14 11v6',
] as const;

export const DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML = DECK_CARD_POPOVER_SVG_DELETE_PATH_DS.map(
    (d) => `<path d="${d}"/>`,
).join('');

export const DECK_CARD_POPOVER_SVG_COVER_INNER_HTML =
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 17l-4.5-4.5L9 20"/>';

export const DECK_CARD_POPOVER_SVG_ASSOCIATED_PATHS_HTML =
    '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>';
```

### 3.6 `deckCardPopoverDomSelectors.ts`

```ts
/**
 * Classes internes du popover « Modifier la carte ».
 */
export const DECK_CARD_POPOVER_QTY_CLASS = 'deck-card-popover-qty';
export const DECK_CARD_POPOVER_QTY_SELECTOR = `.${DECK_CARD_POPOVER_QTY_CLASS}`;

export const DECK_CARD_POPOVER_ENGINE_CLASS = 'deck-card-popover-engine';
export const DECK_CARD_POPOVER_ENGINE_SELECTOR = `.${DECK_CARD_POPOVER_ENGINE_CLASS}`;

export const DECK_CARD_POPOVER_CAT_CONTAINER_CLASS = 'deck-card-popover-cat-container';
export const DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR = `.${DECK_CARD_POPOVER_CAT_CONTAINER_CLASS}`;

export const DECK_CARD_POPOVER_DELETE_CLASS = 'deck-card-popover-delete';
export const DECK_CARD_POPOVER_DELETE_SELECTOR = `.${DECK_CARD_POPOVER_DELETE_CLASS}`;

export const DECK_CARD_POPOVER_CLOSE_CLASS = 'deck-card-popover-close';
export const DECK_CARD_POPOVER_CLOSE_SELECTOR = `.${DECK_CARD_POPOVER_CLOSE_CLASS}`;

export const DECK_CARD_POPOVER_COVER_CLASS = 'deck-card-popover-cover';
export const DECK_CARD_POPOVER_COVER_SELECTOR = `.${DECK_CARD_POPOVER_COVER_CLASS}`;

export const DECK_CARD_POPOVER_ASSOCIATED_CLASS = 'deck-card-popover-associated';
export const DECK_CARD_POPOVER_ASSOCIATED_SELECTOR = `.${DECK_CARD_POPOVER_ASSOCIATED_CLASS}`;

export const DECK_CARD_POPOVER_INNER_CLASS = 'deck-card-popover-inner';
export const DECK_CARD_POPOVER_TITLE_CLASS = 'deck-card-popover-title';
export const DECK_CARD_POPOVER_TITLE_SR_ONLY_CLASS = 'deck-card-popover-title--sr-only';
export const DECK_CARD_POPOVER_SETTINGS_HEADING_CLASS = 'deck-card-popover-settings-heading';

export const DECK_CARD_POPOVER_MAIN_CLASS = 'deck-card-popover-main';
export const DECK_CARD_POPOVER_COL_CLASS = 'deck-card-popover-col';
export const DECK_CARD_POPOVER_COL_TEXT_CLASS = `${DECK_CARD_POPOVER_COL_CLASS} deck-card-popover-col--text`;
export const DECK_CARD_POPOVER_COL_DECK_CLASS = `${DECK_CARD_POPOVER_COL_CLASS} deck-card-popover-col--deck`;

export const DATA_DECK_POPOVER_ART_BANNER = 'data-deck-popover-art-banner';
export const DATA_DECK_POPOVER_NAME = 'data-deck-popover-name';
export const DATA_DECK_POPOVER_TYPE_PRIMARY = 'data-deck-popover-type-primary';
export const DATA_DECK_POPOVER_TYPE_SECONDARY = 'data-deck-popover-type-secondary';
export const DATA_DECK_POPOVER_BADGES = 'data-deck-popover-badges';
export const DATA_DECK_POPOVER_DESC = 'data-deck-popover-desc';

export const DECK_CARD_POPOVER_ART_BANNER_SELECTOR = `[${DATA_DECK_POPOVER_ART_BANNER}]`;
export const DECK_CARD_POPOVER_CARD_NAME_SELECTOR = `[${DATA_DECK_POPOVER_NAME}]`;
export const DECK_CARD_POPOVER_TYPE_PRIMARY_SELECTOR = `[${DATA_DECK_POPOVER_TYPE_PRIMARY}]`;
export const DECK_CARD_POPOVER_TYPE_SECONDARY_SELECTOR = `[${DATA_DECK_POPOVER_TYPE_SECONDARY}]`;
export const DECK_CARD_POPOVER_BADGES_SELECTOR = `[${DATA_DECK_POPOVER_BADGES}]`;
export const DECK_CARD_POPOVER_DESC_SELECTOR = `[${DATA_DECK_POPOVER_DESC}]`;
export const DECK_CARD_POPOVER_ROW_CLASS = 'deck-card-popover-row';
export const DECK_CARD_POPOVER_FIELD_LABEL_CLASS = 'deck-card-popover-field-label';
export const DECK_CARD_POPOVER_FIELD_LABEL_STACK_CLASS = 'deck-card-popover-field-label--stack';
export const DECK_CARD_POPOVER_QTY_INPUT_ID = 'deck-card-popover-qty';
export const DECK_CARD_POPOVER_ENGINE_INPUT_ID = 'deck-card-popover-engine';
export const DECK_CARD_POPOVER_CATS_CLASS = 'deck-card-popover-cats';
export const DECK_CARD_POPOVER_ACTIONS_CLASS = 'deck-card-popover-actions';
export const DECK_CARD_POPOVER_ICON_BTN_CLASS = 'deck-card-popover-icon-btn';
export const DECK_CARD_POPOVER_ICON_CLASS = 'deck-card-popover-icon';

export const DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS = `${DECK_CARD_POPOVER_ICON_BTN_CLASS} ${DECK_CARD_POPOVER_CLOSE_CLASS} btn btn-deck btn-deck-outline`;
export const DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS = `${DECK_CARD_POPOVER_ICON_BTN_CLASS} ${DECK_CARD_POPOVER_DELETE_CLASS} btn btn-deck btn-deck-danger`;
export const DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS = `${DECK_CARD_POPOVER_ICON_BTN_CLASS} ${DECK_CARD_POPOVER_COVER_CLASS} btn btn-deck btn-deck-outline`;
export const DECK_CARD_POPOVER_ASSOCIATED_FULL_BTN_CLASS = `${DECK_CARD_POPOVER_ICON_BTN_CLASS} ${DECK_CARD_POPOVER_ASSOCIATED_CLASS} btn btn-deck btn-deck-outline`;

export const DECK_CARD_POPOVER_BACKDROP_CLASS = 'deck-card-popover-backdrop';
export const DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS = 'deck-card-popover-backdrop--open';

export const DECK_CARD_POPOVER_ROOT_CLASS = 'deck-card-popover';
export const DECK_CARD_POPOVER_OPEN_CLASS = 'deck-card-popover--open';
export const DECK_CARD_POPOVER_ABOVE_CLASS = 'deck-card-popover--above';

export const DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX = 'deck-card-popover-qty--limit-';
export const DECK_CARD_POPOVER_QTY_LIMIT_CLASSES = [
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}0`,
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}1`,
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}2`,
] as const;

export const DATA_DECK_POPOVER_BACKDROP_ATTR = 'data-deck-popover-backdrop';
export const DATA_DECK_POPOVER_BACKDROP_PRESENCE_VALUE = '1';

export {
    DECK_CARD_POPOVER_ASSOCIATED_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE,
    DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_CLOSE_BTN_TITLE,
    DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_COVER_BTN_TITLE,
    DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_DELETE_BTN_TITLE,
    DECK_CARD_POPOVER_HEADING_TEXT,
} from './deckCardPopoverActionTitlesCopy.js';
```

### 3.7 `deckCardPopoverShell.ts`

Construit `deckCardPopoverQtyOptionsHtml`, `deckCardPopoverEngineOptionsHtml` et exporte `DECK_CARD_POPOVER_SHELL_HTML`. **Copie intégrale : Annexe A** (fin du document).

### 3.8 `deckLimitGroups.ts`

```ts
/**
 * Règles banlist TCG et groupes d’exemplaires (*always treated as*, passcode, nom).
 */
import { DECK_DEFAULT_MAX_COPIES_PER_CARD } from './deckConstants.js';

export const DECK_BAN_TCG_MAX_FORBIDDEN = 0;
export const DECK_BAN_TCG_MAX_LIMITED = 1;
export const DECK_BAN_TCG_MAX_SEMI_LIMITED = 2;

export type DeckLimitGroupKey = number | string;

export interface DeckRowLimitFields {
    name: string;
    quantity: number;
    maxCopies?: number;
    cardId?: number;
    deckCopyId?: number;
}

export function deckLimitGroupKeyRow(r: DeckRowLimitFields): DeckLimitGroupKey {
    if (r.deckCopyId != null && r.deckCopyId > 0) return r.deckCopyId;
    if (r.cardId != null && r.cardId > 0) return `id:${r.cardId}`;
    return `n:${r.name}`;
}

export function deckLimitGroupKeyFromCard(
    card: { id?: unknown; deck_copy_id?: unknown },
    displayName: string,
): DeckLimitGroupKey {
    const dc = card.deck_copy_id;
    if (typeof dc === 'number' && dc > 0) return dc;
    const id = card.id;
    if (typeof id === 'number' && id > 0) return `id:${id}`;
    return `n:${displayName}`;
}

export function banTcgToMaxCopies(ban: string | undefined): number {
    const s = (ban ?? '').toLowerCase();
    if (s.includes('forbidden') || s === 'banned') return DECK_BAN_TCG_MAX_FORBIDDEN;
    if (s.includes('limited') && !s.includes('semi')) return DECK_BAN_TCG_MAX_LIMITED;
    if (s.includes('semi')) return DECK_BAN_TCG_MAX_SEMI_LIMITED;
    return DECK_DEFAULT_MAX_COPIES_PER_CARD;
}

export function rowsInDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
): DeckRowLimitFields[] {
    return allRows.filter((r) => deckLimitGroupKeyRow(r) === key);
}

export function totalQtyDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
): number {
    return rowsInDeckLimitGroup(allRows, key).reduce((s, r) => s + r.quantity, 0);
}

export function maxAllowedForDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
    incomingMaxCopies: number,
): number {
    const caps = rowsInDeckLimitGroup(allRows, key).map((r) => r.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD);
    return Math.min(DECK_DEFAULT_MAX_COPIES_PER_CARD, incomingMaxCopies, ...caps);
}

export function canAddToDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
    delta: number,
    incomingMaxCopies: number,
): boolean {
    if (delta <= 0) return true;
    const maxA = maxAllowedForDeckLimitGroup(allRows, key, incomingMaxCopies);
    return totalQtyDeckLimitGroup(allRows, key) + delta <= maxA;
}
```

### 3.9 `deckCardPopoverQuantity.ts`

```ts
import { DECK_DEFAULT_MAX_COPIES_PER_CARD, DECK_DEFAULT_ROW_QUANTITY } from '../deckConstants.js';
import {
    deckLimitGroupKeyRow,
    maxAllowedForDeckLimitGroup,
    totalQtyDeckLimitGroup,
    type DeckRowLimitFields,
} from '../deckLimitGroups.js';
import { INTEGER_STRING_DECIMAL_RADIX } from '../../utils/numberParse.js';

export function maxQuantityAllowedForPopoverRow(
    row: DeckRowLimitFields,
    flat: readonly DeckRowLimitFields[],
): number {
    const key = deckLimitGroupKeyRow(row);
    const maxA = maxAllowedForDeckLimitGroup(flat, key, row.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD);
    const totalOthers = totalQtyDeckLimitGroup(flat, key) - row.quantity;
    return Math.min(
        row.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD,
        Math.max(DECK_DEFAULT_ROW_QUANTITY, maxA - totalOthers),
    );
}

export function clampPopoverQuantityFromSelect(
    selectValue: string,
    row: DeckRowLimitFields,
    flat: readonly DeckRowLimitFields[],
): number {
    let newQty = parseInt(selectValue || String(DECK_DEFAULT_ROW_QUANTITY), INTEGER_STRING_DECIMAL_RADIX);
    const maxForThisRow = maxQuantityAllowedForPopoverRow(row, flat);
    if (newQty > maxForThisRow) newQty = maxForThisRow;
    if (newQty < DECK_DEFAULT_ROW_QUANTITY) newQty = DECK_DEFAULT_ROW_QUANTITY;
    return newQty;
}
```

### 3.10 `categorySelectorCopy.ts`

```ts
export const DROPDOWN_EMPTY_MESSAGE_TEXT = 'Aucune option';
export const DROPDOWN_ARROW_TEXT = '\u25BE';
export const CATEGORY_CHIP_REMOVE_BUTTON_TEXT = '\u00D7';
```

### 3.11 `categoryDomSelectors.ts`

```ts
export const CATEGORY_CONTAINER_CLASS = 'category-container';
export const CHIPS_CATEGORIES_CLASS = 'chips-categories';
export const CHIPS_PLACEHOLDER_CLASS = 'chips-categories__placeholder';
export const DROPDOWN_ARROW_CLASS = 'dropdown-arrow';
export const DROPDOWN_LIST_CLASS = 'dropdown-list';
export const DROPDOWN_LIST_FLOATING_CLASS = 'dropdown-list--floating';
export const DROPDOWN_EMPTY_MESSAGE_CLASS = 'dropdown-list__empty';
export const DROPDOWN_LIST_VISIBLE_CLASS = 'show';
export const CATEGORY_CHIP_CLASS = 'chip';
```

### 3.12 `categoryData.ts`

```ts
export const CATEGORY_GROUPS: Record<string, string[]> = {
    'Core Access': ['Starter', 'Extender', 'Consistency'],
    Disruption: ['Interruption', 'Hand Trap'],
    'Board Reset': ['Board Breaker', 'Floodgate'],
    'Win Setup': ['Wincon', 'Time', 'Brick'],
};

export const categoryOptions: string[] = [
    'Starter',
    'Extender',
    'Board Breaker',
    'Floodgate',
    'Hand Trap',
    'Wincon',
    'Time',
    'Brick',
    'Consistency',
    'Interruption',
    'Going First',
    'Going Second',
];
```

### 3.13 `category.ts`

**Copie intégrale : Annexe B** (fin du document).

### 3.14 `deckCardPopover.ts`

**Copie intégrale : Annexe C** (fin du document).

---

## Fichiers canoniques (chemins)

| Fichier |
|---------|
| `static/js/deck-builder/card-edit-popover/deckCardPopover.ts` |
| `static/js/deck-builder/card-edit-popover/deckCardPopoverShell.ts` |
| `static/js/deck-builder/card-edit-popover/deckCardPopoverDomSelectors.ts` |
| `static/js/deck-builder/card-edit-popover/deckCardPopoverFormCopy.ts` |
| `static/js/deck-builder/card-edit-popover/deckCardPopoverActionTitlesCopy.ts` |
| `static/js/deck-builder/card-edit-popover/deckCardPopoverIconsHtml.ts` |
| `static/js/deck-builder/card-edit-popover/deckCardEditDialogCopy.ts` |
| `static/js/deck-builder/card-edit-popover/deckCardPopoverQuantity.ts` |
| `static/js/deck-builder/deckLimitGroups.ts` |
| `static/js/category.ts` |
| `static/js/categoryData.ts` |
| `static/js/categoryDomSelectors.ts` |
| `static/js/categorySelectorCopy.ts` |
| `static/css/pages/dashboard.css` (blocs `.deck-card-popover*`, `.dropdown-list--floating`, `.card-fiche-badge`) |

---

## Annexe A — `deckCardPopoverShell.ts` (intégral)

```ts
/**
 * Structure statique du dialogue « Modifier la carte » (deck builder).
 * Les libellés et la hiérarchie DOM restent ici ; la logique vit dans deck.ts.
 */
import {
    DECK_CARD_POPOVER_ACTIONS_CLASS,
    DECK_CARD_POPOVER_MAIN_CLASS,
    DECK_CARD_POPOVER_COL_DECK_CLASS,
    DECK_CARD_POPOVER_COL_TEXT_CLASS,
    DECK_CARD_POPOVER_CAT_CONTAINER_CLASS,
    DECK_CARD_POPOVER_CATS_CLASS,
    DECK_CARD_POPOVER_ASSOCIATED_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_ENGINE_CLASS,
    DECK_CARD_POPOVER_ENGINE_INPUT_ID,
    DECK_CARD_POPOVER_FIELD_LABEL_CLASS,
    DECK_CARD_POPOVER_FIELD_LABEL_STACK_CLASS,
    DECK_CARD_POPOVER_ICON_CLASS,
    DATA_DECK_POPOVER_ART_BANNER,
    DATA_DECK_POPOVER_BADGES,
    DATA_DECK_POPOVER_DESC,
    DATA_DECK_POPOVER_NAME,
    DATA_DECK_POPOVER_TYPE_PRIMARY,
    DATA_DECK_POPOVER_TYPE_SECONDARY,
    DECK_CARD_POPOVER_INNER_CLASS,
    DECK_CARD_POPOVER_QTY_CLASS,
    DECK_CARD_POPOVER_QTY_INPUT_ID,
    DECK_CARD_POPOVER_ROW_CLASS,
    DECK_CARD_POPOVER_SETTINGS_HEADING_CLASS,
    DECK_CARD_POPOVER_TITLE_CLASS,
    DECK_CARD_POPOVER_TITLE_SR_ONLY_CLASS,
} from './deckCardPopoverDomSelectors.js';
import {
    DECK_CARD_POPOVER_ASSOCIATED_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE,
    DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_CLOSE_BTN_TITLE,
    DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_COVER_BTN_TITLE,
    DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_DELETE_BTN_TITLE,
    DECK_CARD_POPOVER_HEADING_TEXT,
} from './deckCardPopoverActionTitlesCopy.js';
import {
    DECK_CARD_POPOVER_ICON_SVG_ATTRS,
    DECK_CARD_POPOVER_SVG_ASSOCIATED_PATHS_HTML,
    DECK_CARD_POPOVER_SVG_COVER_INNER_HTML,
    DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML,
    DECK_CARD_POPOVER_SVG_PATH_CLOSE_D,
} from './deckCardPopoverIconsHtml.js';
import {
    DECK_CARD_POPOVER_ENGINE_CHOICES,
    DECK_CARD_POPOVER_ENGINE_OPTION_EMPTY_LABEL,
    DECK_CARD_POPOVER_LABEL_CATEGORIES,
    DECK_CARD_POPOVER_LABEL_ENGINE,
    DECK_CARD_POPOVER_LABEL_QTY,
    DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL,
    DECK_CARD_POPOVER_SHELL_QTY_OPTION_COUNT,
} from './deckCardPopoverFormCopy.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from '../../utils/ariaAttrs.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON, TITLE_ATTR } from '../../utils/htmlAttrs.js';
import { escapeAttr, escapeHtml } from '../../utils/html.js';

const deckCardPopoverQtyOptionsHtml = Array.from({ length: DECK_CARD_POPOVER_SHELL_QTY_OPTION_COUNT }, (_, i) => {
    const v = String(i + 1);
    return `<option value="${v}">${v}</option>`;
}).join('');

const deckCardPopoverEngineOptionsHtml =
    `<option value="">${escapeHtml(DECK_CARD_POPOVER_ENGINE_OPTION_EMPTY_LABEL)}</option>` +
    DECK_CARD_POPOVER_ENGINE_CHOICES.map(
        (e) => `<option value="${escapeAttr(e)}">${escapeHtml(e)}</option>`,
    ).join('');

export const DECK_CARD_POPOVER_SHELL_HTML = `
        <div class="${DECK_CARD_POPOVER_INNER_CLASS}">
            <h4 class="${DECK_CARD_POPOVER_TITLE_CLASS} ${DECK_CARD_POPOVER_TITLE_SR_ONLY_CLASS}">${escapeHtml(DECK_CARD_POPOVER_HEADING_TEXT)}</h4>
            <div class="deck-card-popover-banner-mount" ${DATA_DECK_POPOVER_ART_BANNER}=""></div>
            <div class="${DECK_CARD_POPOVER_MAIN_CLASS}">
                <div class="${DECK_CARD_POPOVER_COL_TEXT_CLASS}">
                    <p class="deck-card-popover-card-name" ${DATA_DECK_POPOVER_NAME}=""></p>
                    <p class="deck-card-popover-type-primary" ${DATA_DECK_POPOVER_TYPE_PRIMARY}=""></p>
                    <p class="deck-card-popover-type-secondary" ${DATA_DECK_POPOVER_TYPE_SECONDARY}=""></p>
                    <div class="deck-card-popover-badge-row" ${DATA_DECK_POPOVER_BADGES}=""></div>
                    <p class="deck-card-popover-card-desc" ${DATA_DECK_POPOVER_DESC}=""></p>
                </div>
                <div class="${DECK_CARD_POPOVER_COL_DECK_CLASS}">
                    <p class="${DECK_CARD_POPOVER_SETTINGS_HEADING_CLASS}">${escapeHtml(DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL)}</p>
                    <div class="${DECK_CARD_POPOVER_ROW_CLASS}">
                        <label class="${DECK_CARD_POPOVER_FIELD_LABEL_CLASS}" for="${DECK_CARD_POPOVER_QTY_INPUT_ID}">${escapeHtml(DECK_CARD_POPOVER_LABEL_QTY)}</label>
                        <select id="${DECK_CARD_POPOVER_QTY_INPUT_ID}" class="${DECK_CARD_POPOVER_QTY_CLASS}" ${ARIA_LABEL_ATTR}="${escapeAttr(DECK_CARD_POPOVER_LABEL_QTY)}" ${TITLE_ATTR}="${escapeAttr(DECK_CARD_POPOVER_LABEL_QTY)}">
                            ${deckCardPopoverQtyOptionsHtml}
                        </select>
                    </div>
                    <div class="${DECK_CARD_POPOVER_ROW_CLASS}">
                        <label class="${DECK_CARD_POPOVER_FIELD_LABEL_CLASS}" for="${DECK_CARD_POPOVER_ENGINE_INPUT_ID}">${escapeHtml(DECK_CARD_POPOVER_LABEL_ENGINE)}</label>
                        <select id="${DECK_CARD_POPOVER_ENGINE_INPUT_ID}" class="${DECK_CARD_POPOVER_ENGINE_CLASS}" ${ARIA_LABEL_ATTR}="${escapeAttr(DECK_CARD_POPOVER_LABEL_ENGINE)}" ${TITLE_ATTR}="${escapeAttr(DECK_CARD_POPOVER_LABEL_ENGINE)}">
                            ${deckCardPopoverEngineOptionsHtml}
                        </select>
                    </div>
                    <div class="${DECK_CARD_POPOVER_ROW_CLASS} ${DECK_CARD_POPOVER_CATS_CLASS}">
                        <label class="${DECK_CARD_POPOVER_FIELD_LABEL_CLASS} ${DECK_CARD_POPOVER_FIELD_LABEL_STACK_CLASS}">
                            ${escapeHtml(DECK_CARD_POPOVER_LABEL_CATEGORIES)}
                            <div class="${DECK_CARD_POPOVER_CAT_CONTAINER_CLASS}"></div>
                        </label>
                    </div>
                </div>
            </div>
            <div class="${DECK_CARD_POPOVER_ACTIONS_CLASS}">
                <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS}" ${TITLE_ATTR}="${DECK_CARD_POPOVER_CLOSE_BTN_TITLE}" ${ARIA_LABEL_ATTR}="${DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL}">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" ${DECK_CARD_POPOVER_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true"><path d="${DECK_CARD_POPOVER_SVG_PATH_CLOSE_D}"/></svg>
                </button>
                <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS}" ${TITLE_ATTR}="${DECK_CARD_POPOVER_DELETE_BTN_TITLE}" ${ARIA_LABEL_ATTR}="${DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL}">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" ${DECK_CARD_POPOVER_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML}</svg>
                </button>
                <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS}" ${TITLE_ATTR}="${DECK_CARD_POPOVER_COVER_BTN_TITLE}" ${ARIA_LABEL_ATTR}="${DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL}">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" ${DECK_CARD_POPOVER_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_CARD_POPOVER_SVG_COVER_INNER_HTML}</svg>
                </button>
                <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_POPOVER_ASSOCIATED_FULL_BTN_CLASS}" ${TITLE_ATTR}="${DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE}" ${ARIA_LABEL_ATTR}="${DECK_CARD_POPOVER_ASSOCIATED_BTN_ARIA_LABEL}">
                    <svg class="${DECK_CARD_POPOVER_ICON_CLASS}" ${DECK_CARD_POPOVER_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_CARD_POPOVER_SVG_ASSOCIATED_PATHS_HTML}</svg>
                </button>
            </div>
        </div>
    `;

```

## Annexe B — `category.ts` (intégral)

```ts
import {
    CATEGORY_CHIP_CLASS,
    CATEGORY_CHIP_REMOVE_BUTTON_TEXT,
    CATEGORY_CONTAINER_CLASS,
    CHIPS_CATEGORIES_CLASS,
    CHIPS_PLACEHOLDER_CLASS,
    DROPDOWN_ARROW_CLASS,
    DROPDOWN_ARROW_TEXT,
    DROPDOWN_EMPTY_MESSAGE_CLASS,
    DROPDOWN_EMPTY_MESSAGE_TEXT,
    DROPDOWN_LIST_CLASS,
    DROPDOWN_LIST_FLOATING_CLASS,
    DROPDOWN_LIST_VISIBLE_CLASS,
} from './categoryDomSelectors.js';
import { DECK_CARD_POPOVER_ROOT_CLASS } from './deck-builder/card-edit-popover/deckCardPopoverDomSelectors.js';
import { categoryOptions } from './categoryData.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from './utils/ariaAttrs.js';
import {
    DOM_EVENT_CLICK,
    DOM_EVENT_KEYDOWN,
    DOM_EVENT_RESIZE,
    DOM_EVENT_SCROLL,
} from './utils/domEventNames.js';
import { KEY_ESCAPE, KEY_TAB } from './utils/keyboardKeys.js';

export { CATEGORY_GROUPS, categoryOptions } from './categoryData.js';

// Gestion des catégories de cartes

/** Entrée de deck avec catégories (pour logique pure). */
export interface DeckEntryWithCategories {
    name: string;
    quantity?: number;
    categories?: string[];
}

export type CreateCategorySelectorOptions = {
    /** Affiché quand aucune catégorie sélectionnée (ex. libellé « Catégories »). */
    placeholder?: string;
    /** Libellé lecteur d’écran ; défaut = placeholder ou « Catégories ». */
    ariaLabel?: string;
};

/** Retourne les entrées du deck qui ont la catégorie donnée. */
export function getCardsByCategory(
    deck: DeckEntryWithCategories[],
    categoryName: string,
): DeckEntryWithCategories[] {
    return deck.filter(
        (entry) => entry.categories && entry.categories.includes(categoryName),
    );
}

/** Nœud DOM renvoyé par `createCategorySelector` (méthodes rattachées sur l’élément racine). */
export interface CategorySelectorElement extends HTMLElement {
    addCategory?: (cat: string) => void;
    setCategories?: (categories: string[]) => void;
    getCategories?: () => string[];
    removeCategory?: (cat: string) => void;
    /** Ferme la liste et la rattache au widget (appeler avant de détruire le conteneur parent). */
    teardown?: () => void;
}

export function isCategorySelectorElement(el: Element | null | undefined): el is CategorySelectorElement {
    return el != null && typeof (el as CategorySelectorElement).getCategories === 'function';
}

export function createCategorySelector(opts: CreateCategorySelectorOptions = {}): CategorySelectorElement {
    const placeholder = opts.placeholder?.trim() ?? '';
    const ariaLabel = (opts.ariaLabel ?? opts.placeholder ?? 'Catégories').trim() || 'Catégories';

    let catSelected: string[] = [];
    const container = document.createElement('div') as CategorySelectorElement;
    container.classList.add(CATEGORY_CONTAINER_CLASS);
    container.setAttribute(ARIA_LABEL_ATTR, ariaLabel);

    const display = document.createElement('div');
    display.className = CHIPS_CATEGORIES_CLASS;
    container.appendChild(display);
    const arrow = document.createElement('span');
    arrow.className = DROPDOWN_ARROW_CLASS;
    arrow.textContent = DROPDOWN_ARROW_TEXT;
    arrow.setAttribute(ARIA_HIDDEN_ATTR, 'true');

    const select = document.createElement('div');
    select.className = DROPDOWN_LIST_CLASS;
    categoryOptions.forEach((cat) => {
        if (!catSelected.includes(cat)) {
            const item = document.createElement('div');
            item.textContent = cat;
            item.onclick = (e) => {
                e.stopPropagation();
                addChip(cat);
                showDropdown(false);
            };
            select.appendChild(item);
        }
    });
    container.appendChild(select);

    function isDeckCardPopoverContext(): boolean {
        return container.closest(`.${DECK_CARD_POPOVER_ROOT_CLASS}`) != null;
    }

    function syncFloatingListGeometry(): void {
        if (!select.classList.contains(DROPDOWN_LIST_FLOATING_CLASS)) return;
        if (!select.classList.contains(DROPDOWN_LIST_VISIBLE_CLASS)) return;
        const rect = container.getBoundingClientRect();
        const gapPx = 4;
        const marginPx = 8;
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0;
        const belowTop = rect.bottom + gapPx;
        const spaceBelow = viewportH - belowTop - marginPx;
        const spaceAbove = rect.top - marginPx;
        const minComfortPx = 100;
        const openBelow = spaceBelow >= minComfortPx || spaceBelow >= spaceAbove;
        let topPx: number;
        let maxHPx: number;
        if (openBelow) {
            topPx = belowTop;
            maxHPx = Math.min(200, Math.max(72, spaceBelow));
        } else {
            maxHPx = Math.min(200, Math.max(72, spaceAbove - gapPx));
            topPx = rect.top - gapPx - maxHPx;
        }
        select.style.position = 'fixed';
        select.style.left = `${rect.left}px`;
        select.style.top = `${topPx}px`;
        select.style.width = `${rect.width}px`;
        select.style.maxHeight = `${maxHPx}px`;
        select.style.right = 'auto';
    }

    const onFloatingSync = (): void => {
        syncFloatingListGeometry();
    };

    container.addEventListener(DOM_EVENT_CLICK, () => {
        if (select.classList.contains(DROPDOWN_LIST_VISIBLE_CLASS)) {
            showDropdown(false);
        } else {
            showDropdown(true);
        }
    });
    document.addEventListener(DOM_EVENT_CLICK, (e) => {
        if (!container.contains(e.target as Node) && !select.contains(e.target as Node)) {
            showDropdown(false);
        }
    });
    container.addEventListener(DOM_EVENT_KEYDOWN, (e) => {
        const key = (e as KeyboardEvent).key;
        if (key === KEY_ESCAPE || key === KEY_TAB) showDropdown(false);
    });
    function renderChips() {
        display.innerHTML = '';
        if (catSelected.length === 0 && placeholder) {
            const ph = document.createElement('span');
            ph.className = CHIPS_PLACEHOLDER_CLASS;
            ph.textContent = placeholder;
            display.appendChild(ph);
        }
        catSelected.forEach((value) => {
            const chip = document.createElement('span');
            chip.className = CATEGORY_CHIP_CLASS;
            chip.textContent = value;
            const btn = document.createElement('button');
            btn.textContent = CATEGORY_CHIP_REMOVE_BUTTON_TEXT;
            btn.onclick = (e) => {
                e.stopPropagation();
                removeChip(value);
            };
            chip.appendChild(btn);
            display.appendChild(chip);
        });
        display.appendChild(arrow);
        if (catSelected.length > 0) {
            const summary = catSelected.join(', ');
            container.title =
                summary.length > 120 ? `${ariaLabel} : ${summary.slice(0, 117)}…` : `${ariaLabel} : ${summary}`;
        } else {
            container.removeAttribute('title');
        }
    }
    function renderDropdown() {
        select.innerHTML = '';
        categoryOptions.forEach((opt) => {
            if (!catSelected.includes(opt)) {
                const item = document.createElement('div');
                item.textContent = opt;
                item.onclick = (e) => {
                    e.stopPropagation();
                    addChip(opt);
                    showDropdown(false);
                };
                select.appendChild(item);
            }
        });
        if (select.innerHTML.trim() === '') {
            const none = document.createElement('div');
            none.classList.add(DROPDOWN_EMPTY_MESSAGE_CLASS);
            none.textContent = DROPDOWN_EMPTY_MESSAGE_TEXT;
            select.appendChild(none);
        }
    }
    function addChip(value: string) {
        if (!catSelected.includes(value)) {
            catSelected.push(value);
            renderChips();
        }
    }
    function removeChip(value: string) {
        catSelected = catSelected.filter((val) => val !== value);
        renderChips();
    }
    function detachFloatingList(): void {
        if (!select.classList.contains(DROPDOWN_LIST_FLOATING_CLASS)) return;
        window.removeEventListener(DOM_EVENT_SCROLL, onFloatingSync, true);
        window.removeEventListener(DOM_EVENT_RESIZE, onFloatingSync);
        select.classList.remove(DROPDOWN_LIST_FLOATING_CLASS);
        container.appendChild(select);
        select.style.removeProperty('position');
        select.style.removeProperty('left');
        select.style.removeProperty('top');
        select.style.removeProperty('width');
        select.style.removeProperty('max-height');
        select.style.removeProperty('right');
    }

    function showDropdown(show: boolean) {
        if (show) {
            renderDropdown();
            if (isDeckCardPopoverContext()) {
                select.classList.add(DROPDOWN_LIST_FLOATING_CLASS);
                document.body.appendChild(select);
                window.addEventListener(DOM_EVENT_SCROLL, onFloatingSync, true);
                window.addEventListener(DOM_EVENT_RESIZE, onFloatingSync);
            }
            select.classList.add(DROPDOWN_LIST_VISIBLE_CLASS);
            if (select.classList.contains(DROPDOWN_LIST_FLOATING_CLASS)) {
                syncFloatingListGeometry();
            }
        } else {
            select.classList.remove(DROPDOWN_LIST_VISIBLE_CLASS);
            detachFloatingList();
        }
    }
    container.addCategory = function (cat: string) {
        addChip(cat);
    };
    container.setCategories = function (categories: string[]) {
        categories.forEach((cat) => addChip(cat));
    };
    container.getCategories = function () {
        return [...catSelected];
    };
    container.removeCategory = function (cat: string) {
        removeChip(cat);
    };
    container.teardown = function () {
        showDropdown(false);
    };
    renderChips();
    return container;
}

```

## Annexe C — `deckCardPopover.ts` (intégral)

```ts
/**
 * Popover « Modifier la carte » (quantité, engine, catégories, suppression, couverture, cartes associées).
 */
import { fetchCardByName } from '../../api.js';
import { openAssociatedCardsModal } from '../../associations/modal.js';
import { resolveDeckCardForAssociationName } from '../../associations/modalController.js';
import {
    buildCardArtBannerHtml,
    CARD_ART_BANNER_IMG_CLASS,
    cardArtBannerFrameHintFromType,
} from '../../components/cardArtBanner.js';
import { buildCardFicheBadgesInnerHtml } from '../../cardFicheBadges.js';
import { createCategorySelector, isCategorySelectorElement, type CategorySelectorElement } from '../../category.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR, ARIA_MODAL_ATTR } from '../../utils/ariaAttrs.js';
import { STYLE_DISPLAY_DEFAULT, STYLE_DISPLAY_NONE } from '../../utils/cssInlineDisplay.js';
import { cssLengthPx } from '../../utils/cssInlineLength.js';
import { HTML_DATASET_VALUE_BOUND, ROLE_ATTR, ROLE_DIALOG } from '../../utils/htmlAttrs.js';
import {
    DOM_EVENT_CHANGE,
    DOM_EVENT_CLICK,
    DOM_EVENT_KEYDOWN,
    DOM_EVENT_RESIZE,
    DOM_EVENT_SCROLL,
} from '../../utils/domEventNames.js';
import { KEY_ESCAPE } from '../../utils/keyboardKeys.js';
import {
    DECK_CARD_POPOVER_GAP_PX,
    DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX,
    DECK_DEFAULT_MAX_COPIES_PER_CARD,
    DECK_DEFAULT_ROW_QUANTITY,
} from '../deckConstants.js';
import type { DeckSection } from '../../deckSectionOrder.js';
import {
    deckCellSelector,
    DECK_CARD_QTY_DISPLAY_PREFIX,
    DECK_CARD_QTY_SELECTOR,
} from '../grid/deckGridDomSelectors.js';
import {
    DATA_DECK_POPOVER_BACKDROP_ATTR,
    DATA_DECK_POPOVER_BACKDROP_PRESENCE_VALUE,
    DECK_CARD_POPOVER_ABOVE_CLASS,
    DECK_CARD_POPOVER_BACKDROP_CLASS,
    DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS,
    DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR,
    DECK_CARD_POPOVER_ART_BANNER_SELECTOR,
    DECK_CARD_POPOVER_ASSOCIATED_SELECTOR,
    DECK_CARD_POPOVER_BADGES_SELECTOR,
    DECK_CARD_POPOVER_CARD_NAME_SELECTOR,
    DECK_CARD_POPOVER_DESC_SELECTOR,
    DECK_CARD_POPOVER_CLOSE_SELECTOR,
    DECK_CARD_POPOVER_COVER_SELECTOR,
    DECK_CARD_POPOVER_DELETE_SELECTOR,
    DECK_CARD_POPOVER_ENGINE_SELECTOR,
    DECK_CARD_POPOVER_OPEN_CLASS,
    DECK_CARD_POPOVER_HEADING_TEXT,
    DECK_CARD_POPOVER_QTY_LIMIT_CLASSES,
    DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX,
    DECK_CARD_POPOVER_QTY_SELECTOR,
    DECK_CARD_POPOVER_ROOT_CLASS,
    DECK_CARD_POPOVER_TYPE_PRIMARY_SELECTOR,
    DECK_CARD_POPOVER_TYPE_SECONDARY_SELECTOR,
} from './deckCardPopoverDomSelectors.js';
import { DECK_CARD_POPOVER_SHELL_HTML } from './deckCardPopoverShell.js';
import {
    clampPopoverQuantityFromSelect,
    maxQuantityAllowedForPopoverRow,
} from './deckCardPopoverQuantity.js';
import {
    DECK_CARD_POPOVER_CATEGORIES_PLACEHOLDER,
    DECK_CARD_POPOVER_DESC_EMPTY_LABEL,
    DECK_CARD_POPOVER_LABEL_CATEGORIES,
} from './deckCardPopoverFormCopy.js';

function fillDeckCardPopoverHero(popover: HTMLElement, row: DeckPopoverRow): void {
    const bannerHost = popover.querySelector(DECK_CARD_POPOVER_ART_BANNER_SELECTOR) as HTMLElement | null;
    const nameEl = popover.querySelector(DECK_CARD_POPOVER_CARD_NAME_SELECTOR) as HTMLElement | null;
    const typePrimary = popover.querySelector(DECK_CARD_POPOVER_TYPE_PRIMARY_SELECTOR) as HTMLElement | null;
    const typeSecondary = popover.querySelector(DECK_CARD_POPOVER_TYPE_SECONDARY_SELECTOR) as HTMLElement | null;
    const badgesEl = popover.querySelector(DECK_CARD_POPOVER_BADGES_SELECTOR) as HTMLElement | null;
    const descEl = popover.querySelector(DECK_CARD_POPOVER_DESC_SELECTOR) as HTMLElement | null;
    if (!nameEl || !typePrimary || !typeSecondary || !badgesEl) return;

    const url = typeof row.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl.trim() : '';
    if (bannerHost) {
        bannerHost.innerHTML = buildCardArtBannerHtml(url, {
            alt: row.name,
            loading: 'eager',
            frameHint: cardArtBannerFrameHintFromType(row.type),
            variant: 'compact',
            rootClassExtra: 'deck-card-popover__art-banner',
        });
    }
    nameEl.textContent = row.name;
    const typeStr = (row.type ?? '').trim();
    typePrimary.textContent = typeStr;
    typePrimary.style.display = typeStr ? '' : 'none';
    const raceStr = (row.race ?? '').trim();
    typeSecondary.textContent = raceStr;
    typeSecondary.style.display = raceStr ? '' : 'none';
    badgesEl.innerHTML = buildCardFicheBadgesInnerHtml({
        type: row.type,
        level: row.level,
        attribute: row.attribute,
        atk: row.atk ?? null,
        def: row.def ?? null,
    });
    if (descEl) {
        const d = row.cardDesc?.trim();
        descEl.textContent = d || DECK_CARD_POPOVER_DESC_EMPTY_LABEL;
    }
}

export type { DeckSection };

/** Ligne deck telle qu’éditée dans le popover (champs mutables + limites). */
export interface DeckPopoverRow {
    name: string;
    quantity: number;
    engine: string;
    categories: string[];
    maxCopies?: number;
    cardId?: number;
    deckCopyId?: number;
    imageUrl?: string;
    /** Méta affichage « fiche » (aligné sur `DeckRow`). */
    type?: string;
    race?: string;
    level?: number;
    attribute?: string;
    atk?: number;
    def?: number;
    cardDesc?: string;
}

export interface CreateDeckCardPopoverDeps {
    getState: (section: DeckSection) => DeckPopoverRow[];
    allDeckRowsFlat: () => DeckPopoverRow[];
    renderDeckSection: (section: DeckSection) => void;
    /** Après changement de qty / engine / catégories / grille. */
    afterDeckDataChange: () => void;
    getCurrentLoadedDeck: () => { id: number; name: string } | null;
    setDeckCover: (deckId: number, imageUrl: string, name: string) => void;
    updateDeckOnServer: () => Promise<unknown>;
}

export interface DeckCardPopoverApi {
    openPopover(section: DeckSection, index: number, _anchor: HTMLElement): void;
    hide(): void;
    isOpen(): boolean;
    persistEdits(): void;
    getActiveCell(): { section: DeckSection; index: number } | null;
}

export function createDeckCardPopover(deps: CreateDeckCardPopoverDeps): DeckCardPopoverApi {
    const {
        getState,
        allDeckRowsFlat,
        renderDeckSection,
        afterDeckDataChange,
        getCurrentLoadedDeck,
        setDeckCover,
        updateDeckOnServer,
    } = deps;

    let popoverEl: HTMLElement | null = null;
    let popoverBackdropEl: HTMLElement | null = null;
    let popoverSection: DeckSection | null = null;
    let popoverIndex = -1;

    function isOpen(): boolean {
        return Boolean(popoverEl?.classList.contains(DECK_CARD_POPOVER_OPEN_CLASS));
    }

    function persistEdits(): void {
        if (!popoverEl || popoverSection == null || popoverIndex < 0) return;
        const qtySelect = popoverEl.querySelector(DECK_CARD_POPOVER_QTY_SELECTOR) as HTMLSelectElement | null;
        const engineSelect = popoverEl.querySelector(DECK_CARD_POPOVER_ENGINE_SELECTOR) as HTMLSelectElement | null;
        const catContainer = popoverEl.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement | null;
        const arr = getState(popoverSection);
        const row = arr[popoverIndex];
        if (!row) return;
        const flat = allDeckRowsFlat();
        const newQty = clampPopoverQuantityFromSelect(qtySelect?.value || String(DECK_DEFAULT_ROW_QUANTITY), row, flat);
        row.quantity = newQty;
        if (qtySelect) qtySelect.value = String(newQty);
        row.engine = engineSelect?.value || '';
        const catEl = catContainer?.firstElementChild;
        if (isCategorySelectorElement(catEl) && catEl.getCategories) {
            row.categories = catEl.getCategories();
        }
        afterDeckDataChange();
        const cell = document.querySelector(deckCellSelector(popoverSection, popoverIndex));
        const badge = cell?.querySelector(DECK_CARD_QTY_SELECTOR);
        if (badge) badge.textContent = DECK_CARD_QTY_DISPLAY_PREFIX + row.quantity;
    }

    function teardownOpenCategorySelector(): void {
        if (!popoverEl) return;
        const catHost = popoverEl.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement | null;
        const root = catHost?.firstElementChild as CategorySelectorElement | null;
        root?.teardown?.();
    }

    function hide(): void {
        teardownOpenCategorySelector();
        popoverBackdropEl?.classList.remove(DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS);
        if (popoverEl) popoverEl.classList.remove(DECK_CARD_POPOVER_OPEN_CLASS);
        popoverSection = null;
        popoverIndex = -1;
    }

    function dismissSaving(): void {
        persistEdits();
        hide();
    }

    function repositionPopover(): void {
        if (!popoverEl || !popoverEl.classList.contains(DECK_CARD_POPOVER_OPEN_CLASS) || popoverSection == null || popoverIndex < 0)
            return;
        const anchor = document.querySelector(deckCellSelector(popoverSection, popoverIndex)) as HTMLElement | null;
        if (!anchor) {
            hide();
            return;
        }
        const margin = DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX;
        const gap = DECK_CARD_POPOVER_GAP_PX;
        const rect = anchor.getBoundingClientRect();
        const popoverHeight = popoverEl.offsetHeight;
        const popoverWidth = popoverEl.offsetWidth;
        const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
        const openAbove = spaceBelow < popoverHeight;

        let top = openAbove ? rect.top - popoverHeight - gap : rect.bottom + gap;
        const maxTop = window.innerHeight - margin - popoverHeight;
        const minTop = margin;
        if (maxTop >= minTop) {
            top = Math.min(Math.max(top, minTop), maxTop);
        } else {
            top = minTop;
        }

        let left = rect.left;
        const maxLeft = window.innerWidth - margin - popoverWidth;
        const minLeft = margin;
        if (maxLeft >= minLeft) {
            left = Math.min(Math.max(left, minLeft), maxLeft);
        } else {
            left = minLeft;
        }

        popoverEl.style.left = cssLengthPx(left);
        popoverEl.style.top = cssLengthPx(top);
        if (openAbove) popoverEl.classList.add(DECK_CARD_POPOVER_ABOVE_CLASS);
        else popoverEl.classList.remove(DECK_CARD_POPOVER_ABOVE_CLASS);
    }

    function getOrCreatePopover(): HTMLElement {
        if (popoverEl) return popoverEl;

        popoverBackdropEl = document.createElement('div');
        popoverBackdropEl.className = DECK_CARD_POPOVER_BACKDROP_CLASS;
        popoverBackdropEl.setAttribute(DATA_DECK_POPOVER_BACKDROP_ATTR, DATA_DECK_POPOVER_BACKDROP_PRESENCE_VALUE);
        popoverBackdropEl.setAttribute(ARIA_HIDDEN_ATTR, 'true');
        document.body.appendChild(popoverBackdropEl);
        popoverBackdropEl.addEventListener(DOM_EVENT_CLICK, () => dismissSaving());

        popoverEl = document.createElement('div');
        popoverEl.className = DECK_CARD_POPOVER_ROOT_CLASS;
        popoverEl.setAttribute(ROLE_ATTR, ROLE_DIALOG);
        popoverEl.setAttribute(ARIA_MODAL_ATTR, 'true');
        popoverEl.setAttribute(ARIA_LABEL_ATTR, DECK_CARD_POPOVER_HEADING_TEXT);
        popoverEl.innerHTML = DECK_CARD_POPOVER_SHELL_HTML;
        document.body.appendChild(popoverEl);

        const qtySelect = popoverEl.querySelector(DECK_CARD_POPOVER_QTY_SELECTOR) as HTMLSelectElement;
        const engineSelect = popoverEl.querySelector(DECK_CARD_POPOVER_ENGINE_SELECTOR) as HTMLSelectElement;
        const catContainer = popoverEl.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement;
        const deleteBtn = popoverEl.querySelector(DECK_CARD_POPOVER_DELETE_SELECTOR);
        const closeBtn = popoverEl.querySelector(DECK_CARD_POPOVER_CLOSE_SELECTOR);
        const coverBtn = popoverEl.querySelector(DECK_CARD_POPOVER_COVER_SELECTOR);
        const associatedBtn = popoverEl.querySelector(DECK_CARD_POPOVER_ASSOCIATED_SELECTOR);

        qtySelect?.addEventListener(DOM_EVENT_CHANGE, () => persistEdits());
        engineSelect?.addEventListener(DOM_EVENT_CHANGE, () => persistEdits());
        catContainer?.addEventListener(DOM_EVENT_CHANGE, () => persistEdits());

        deleteBtn?.addEventListener(DOM_EVENT_CLICK, () => {
            if (popoverSection == null || popoverIndex < 0) return;
            persistEdits();
            const sec = popoverSection;
            const idx = popoverIndex;
            const arr = getState(sec);
            arr.splice(idx, 1);
            renderDeckSection(sec);
            afterDeckDataChange();
            hide();
        });

        closeBtn?.addEventListener(DOM_EVENT_CLICK, () => dismissSaving());
        associatedBtn?.addEventListener(DOM_EVENT_CLICK, (e) => {
            e.stopPropagation();
            if (popoverSection == null || popoverIndex < 0) return;
            persistEdits();
            const sec = popoverSection;
            const idx = popoverIndex;
            const arr = getState(sec);
            const row = arr[idx];
            hide();
            if (!row) return;
            void (async () => {
                if (row.cardId != null) {
                    const raw: Record<string, unknown> = {
                        id: row.cardId,
                        name: row.name,
                    };
                    if (row.imageUrl) raw.image_url = row.imageUrl;
                    await openAssociatedCardsModal(raw);
                    return;
                }
                const card = await resolveDeckCardForAssociationName(row.name);
                if (!card) {
                    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                        console.warn('[deck-card-popover] Carte introuvable pour les associations :', row.name);
                    }
                    return;
                }
                await openAssociatedCardsModal(card as Record<string, unknown>);
            })();
        });
        coverBtn?.addEventListener(DOM_EVENT_CLICK, async () => {
            const deck = getCurrentLoadedDeck();
            if (popoverSection == null || popoverIndex < 0 || !deck) return;
            const arr = getState(popoverSection);
            const row = arr[popoverIndex];
            if (!row) return;
            persistEdits();
            setDeckCover(deck.id, row.imageUrl ?? '', row.name);
            hide();
            await updateDeckOnServer();
        });

        document.addEventListener(DOM_EVENT_SCROLL, repositionPopover, true);
        window.addEventListener(DOM_EVENT_RESIZE, repositionPopover);

        if (document.documentElement.dataset.deckPopoverEscapeBound !== HTML_DATASET_VALUE_BOUND) {
            document.documentElement.dataset.deckPopoverEscapeBound = HTML_DATASET_VALUE_BOUND;
            document.addEventListener(DOM_EVENT_KEYDOWN, (e: KeyboardEvent) => {
                if (e.key !== KEY_ESCAPE) return;
                if (!isOpen()) return;
                dismissSaving();
            });
        }

        return popoverEl;
    }

    function openPopover(section: DeckSection, index: number, _anchor: HTMLElement): void {
        const arr = getState(section);
        const row = arr[index];
        if (!row) return;
        if (isOpen() && (popoverSection !== section || popoverIndex !== index)) {
            persistEdits();
        }
        const popover = getOrCreatePopover();
        popoverSection = section;
        popoverIndex = index;

        const qtySelect = popover.querySelector(DECK_CARD_POPOVER_QTY_SELECTOR) as HTMLSelectElement;
        const engineSelect = popover.querySelector(DECK_CARD_POPOVER_ENGINE_SELECTOR) as HTMLSelectElement;
        const catContainer = popover.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement;
        if (qtySelect) {
            const flat = allDeckRowsFlat();
            const cap = maxQuantityAllowedForPopoverRow(row, flat);
            qtySelect.innerHTML = '';
            for (let q = DECK_DEFAULT_ROW_QUANTITY; q <= cap; q++) {
                const opt = document.createElement('option');
                opt.value = String(q);
                opt.textContent = String(q);
                qtySelect.appendChild(opt);
            }
            qtySelect.value = String(Math.min(row.quantity, cap));
            qtySelect.classList.remove(...DECK_CARD_POPOVER_QTY_LIMIT_CLASSES);
            const limit = row.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD;
            if (limit < DECK_DEFAULT_MAX_COPIES_PER_CARD)
                qtySelect.classList.add(`${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}${limit}`);
        }
        if (engineSelect) engineSelect.value = row.engine || '';
        if (catContainer) {
            const prevRoot = catContainer.firstElementChild as CategorySelectorElement | null;
            prevRoot?.teardown?.();
            catContainer.innerHTML = '';
            const selector = createCategorySelector({
                placeholder: DECK_CARD_POPOVER_CATEGORIES_PLACEHOLDER,
                ariaLabel: DECK_CARD_POPOVER_LABEL_CATEGORIES,
            });
            if (row.categories.length) selector.setCategories?.(row.categories);
            catContainer.appendChild(selector);
        }

        const coverBtnEl = popover.querySelector(DECK_CARD_POPOVER_COVER_SELECTOR) as HTMLElement | null;
        if (coverBtnEl)
            coverBtnEl.style.display = getCurrentLoadedDeck() ? STYLE_DISPLAY_DEFAULT : STYLE_DISPLAY_NONE;

        fillDeckCardPopoverHero(popover, row);

        const bannerImg = popover.querySelector(
            `.deck-card-popover__art-banner .${CARD_ART_BANNER_IMG_CLASS}`,
        ) as HTMLImageElement | null;
        if (bannerImg) {
            if (bannerImg.complete) requestAnimationFrame(() => repositionPopover());
            else bannerImg.addEventListener('load', () => repositionPopover(), { once: true });
        }

        const nameForDesc = row.name.trim();
        if (!row.cardDesc?.trim() && nameForDesc) {
            void fetchCardByName(nameForDesc).then((c) => {
                if (!popover.classList.contains(DECK_CARD_POPOVER_OPEN_CLASS)) return;
                const arrNow = getState(section);
                if (arrNow[index] !== row) return;
                const d = typeof c?.desc === 'string' ? c.desc.trim() : '';
                if (d) row.cardDesc = d;
                const descHost = popover.querySelector(DECK_CARD_POPOVER_DESC_SELECTOR) as HTMLElement | null;
                if (descHost) {
                    descHost.textContent =
                        (row.cardDesc || '').trim() || DECK_CARD_POPOVER_DESC_EMPTY_LABEL;
                }
                requestAnimationFrame(() => repositionPopover());
            });
        }

        popoverBackdropEl?.classList.add(DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS);
        popover.classList.add(DECK_CARD_POPOVER_OPEN_CLASS);
        repositionPopover();
        requestAnimationFrame(() => repositionPopover());
    }

    function getActiveCell(): { section: DeckSection; index: number } | null {
        if (popoverSection == null || popoverIndex < 0) return null;
        return { section: popoverSection, index: popoverIndex };
    }

    return {
        openPopover,
        hide,
        isOpen,
        persistEdits,
        getActiveCell,
    };
}

```
