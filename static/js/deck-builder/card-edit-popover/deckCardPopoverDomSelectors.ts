/**
 * Classes internes du popover « Modifier la carte ».
 */

import { DECK_CARD_EDIT_DIALOG_TITLE } from '../../utils/deckCardEditLabels.js';

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

export const DECK_CARD_POPOVER_INNER_CLASS = 'deck-card-popover-inner';
export const DECK_CARD_POPOVER_TITLE_CLASS = 'deck-card-popover-title';
export const DECK_CARD_POPOVER_ROW_CLASS = 'deck-card-popover-row';
export const DECK_CARD_POPOVER_CATS_CLASS = 'deck-card-popover-cats';
export const DECK_CARD_POPOVER_ACTIONS_CLASS = 'deck-card-popover-actions';
export const DECK_CARD_POPOVER_ICON_BTN_CLASS = 'deck-card-popover-icon-btn';
export const DECK_CARD_POPOVER_ICON_CLASS = 'deck-card-popover-icon';

/** Attributs communs des `<svg class="…popover-icon">` (traits UI). */
export const DECK_CARD_POPOVER_ICON_SVG_ATTRS =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** Path `d` — bouton fermer (croix). */
export const DECK_CARD_POPOVER_SVG_PATH_CLOSE_D = 'M18 6L6 18M6 6l12 12';

const DECK_CARD_POPOVER_SVG_DELETE_PATH_DS = [
    'M3 6h18',
    'M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2',
    'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
    'M10 11v6M14 11v6',
] as const;

/** Fragments `<path d="…"/>` empilés pour l’icône corbeille. */
export const DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML = DECK_CARD_POPOVER_SVG_DELETE_PATH_DS.map(
    (d) => `<path d="${d}"/>`,
).join('');

/** Rect + cercle + path pour l’icône couverture (galerie). */
export const DECK_CARD_POPOVER_SVG_COVER_INNER_HTML =
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 17l-4.5-4.5L9 20"/>';

/** Classes complètes des boutons (icon + rôle + utilities `btn-deck`). */
export const DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS = `${DECK_CARD_POPOVER_ICON_BTN_CLASS} ${DECK_CARD_POPOVER_CLOSE_CLASS} btn btn-deck btn-deck-outline`;
export const DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS = `${DECK_CARD_POPOVER_ICON_BTN_CLASS} ${DECK_CARD_POPOVER_DELETE_CLASS} btn btn-deck btn-deck-danger`;
export const DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS = `${DECK_CARD_POPOVER_ICON_BTN_CLASS} ${DECK_CARD_POPOVER_COVER_CLASS} btn btn-deck btn-deck-outline`;

/** Libellés `title` / `aria-label` des boutons d’action du popover. */
export const DECK_CARD_POPOVER_CLOSE_BTN_TITLE = 'Enregistrer les modifications et fermer';
export const DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL = 'Enregistrer et fermer';
export const DECK_CARD_POPOVER_DELETE_BTN_TITLE = 'Supprimer cette ligne du deck';
export const DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL = 'Supprimer la carte du deck';
export const DECK_CARD_POPOVER_COVER_BTN_TITLE =
    'Définir cette carte comme couverture du deck (liste Mes decks)';
export const DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL = 'Définir comme couverture du deck';

/** Titre visible (`<h4>`) et `aria-label` du dialogue. */
export const DECK_CARD_POPOVER_HEADING_TEXT = DECK_CARD_EDIT_DIALOG_TITLE;

export const DECK_CARD_POPOVER_BACKDROP_CLASS = 'deck-card-popover-backdrop';
export const DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS = 'deck-card-popover-backdrop--open';

export const DECK_CARD_POPOVER_ROOT_CLASS = 'deck-card-popover';
export const DECK_CARD_POPOVER_OPEN_CLASS = 'deck-card-popover--open';
export const DECK_CARD_POPOVER_ABOVE_CLASS = 'deck-card-popover--above';

/** Modificateurs banlist sur le &lt;select&gt; quantité (0 / 1 / 2 exemplaires max). */
export const DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX = 'deck-card-popover-qty--limit-';
export const DECK_CARD_POPOVER_QTY_LIMIT_CLASSES = [
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}0`,
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}1`,
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}2`,
] as const;

export const DATA_DECK_POPOVER_BACKDROP_ATTR = 'data-deck-popover-backdrop';
