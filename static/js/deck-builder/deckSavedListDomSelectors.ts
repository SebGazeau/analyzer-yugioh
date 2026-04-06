/**
 * Cartes « Mes decks » (liste sauvegardée) : classes, attributs `data-deck-*`, sélecteurs boutons.
 */

import { ARIA_HIDDEN_ATTR } from '../utils/ariaAttrs.js';

export const DECK_SAVED_ITEM_COVER_CLASS = 'deck-saved-item-cover';
export const DECK_SAVED_ITEM_COVER_IMG_CLASS = 'deck-saved-item-cover-img';
export const DECK_SAVED_ITEM_COVER_PLACEHOLDER_CLASS = 'deck-saved-item-cover-placeholder';
export const DECK_SAVED_ITEM_BODY_CLASS = 'deck-saved-item-body';
export const DECK_SAVED_ITEM_NAME_CLASS = 'deck-saved-item-name';
export const DECK_SAVED_ITEM_FOOTER_CLASS = 'deck-saved-item-footer';
export const DECK_SAVED_ITEM_META_CLASS = 'deck-saved-item-meta';
export const DECK_SAVED_ITEM_ACTIONS_CLASS = 'deck-saved-item-actions';
export const DECK_SAVED_ITEM_DUPLICATE_CLASS = 'deck-saved-item-duplicate';
export const DECK_SAVED_ITEM_DELETE_CLASS = 'deck-saved-item-delete';
export const DECK_SAVED_ITEM_DUPLICATE_ICON_CLASS = 'deck-saved-item-duplicate-icon';
export const DECK_SAVED_ITEM_DELETE_ICON_CLASS = 'deck-saved-item-delete-icon';

/** Attributs racine des SVG 18×18 (boutons dupliquer / supprimer dans la liste). */
export const DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS =
    'xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** Contenu interne SVG — bouton supprimer (corbeille). */
export const DECK_SAVED_ITEM_DELETE_SVG_INNER_HTML =
    '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>';

/** Contenu interne SVG — bouton dupliquer. */
export const DECK_SAVED_ITEM_DUPLICATE_SVG_INNER_HTML =
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';

export const DECK_SAVED_ITEM_DUPLICATE_SELECTOR = `.${DECK_SAVED_ITEM_DUPLICATE_CLASS}`;
export const DECK_SAVED_ITEM_DELETE_SELECTOR = `.${DECK_SAVED_ITEM_DELETE_CLASS}`;

export const DATA_DECK_ID_ATTR = 'data-deck-id';
export const DATA_DECK_DUPLICATE_ATTR = 'data-deck-duplicate';
export const DATA_DECK_DELETE_ATTR = 'data-deck-delete';

/** SVG complet du bouton supprimer (liste Mes decks). */
export function htmlDeckSavedItemDeleteActionSvg(): string {
    return `<svg class="${DECK_SAVED_ITEM_DELETE_ICON_CLASS}" ${DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_SAVED_ITEM_DELETE_SVG_INNER_HTML}</svg>`;
}

/** SVG complet du bouton dupliquer (liste Mes decks). */
export function htmlDeckSavedItemDuplicateActionSvg(): string {
    return `<svg class="${DECK_SAVED_ITEM_DUPLICATE_ICON_CLASS}" ${DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_SAVED_ITEM_DUPLICATE_SVG_INNER_HTML}</svg>`;
}

export {
    DECK_SAVED_ITEM_DELETE_BTN_TITLE,
    DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE,
    deckSavedListItemLoadTitle,
} from './deckSavedListTitlesCopy.js';
