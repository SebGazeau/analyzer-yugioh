/**
 * Gabarit HTML statique d’une cellule carte dans les grilles main / extra / side.
 * Les attributs dynamiques (section, index, title) sont posés sur le nœud dans deckGridRender.
 */

import { DATA_DECK_ACTION_ATTR, DECK_ACTION_REMOVE_ONE } from '../deckConstants.js';
import {
    DECK_CARD_BAN_BADGE_CLASS,
    DECK_CARD_QTY_CLASS,
    DECK_CARD_QTY_DISPLAY_PREFIX,
    DECK_CARD_REMOVE_ONE_BTN_CLASS,
    DECK_CARD_REMOVE_ONE_BTN_LABEL,
    DECK_CARD_REMOVE_ONE_ICON_CLASS,
    DECK_CARD_REMOVE_ONE_ICON_SVG_ATTRS,
    DECK_CARD_REMOVE_ONE_PATH_HTML,
    DECK_CARD_THUMB_IMG_CLASS,
    DECK_CARD_THUMB_PLACEHOLDER_CLASS,
    DECK_CARD_THUMB_WRAPPER_CLASS,
    deckCardBanBadgeTitle,
} from './deckGridDomSelectors.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from '../../utils/ariaAttrs.js';
import {
    BTN_TYPE_ATTR,
    BTN_TYPE_BUTTON,
    DRAGGABLE_ATTR,
    DRAGGABLE_FALSE,
    IMG_LOADING_ATTR,
    IMG_LOADING_LAZY,
    TITLE_ATTR,
} from '../../utils/htmlAttrs.js';
import { escapeAttr } from '../../utils/html.js';

export interface DeckCardCellShellRow {
    imageUrl?: string;
    maxCopies?: number;
    quantity: number;
}

/** Contenu interne de `.deck-card-cell` (hors classe `--monster|spell|trap`). */
export function buildDeckCardCellInnerHtml(row: DeckCardCellShellRow): string {
    const thumbHtml = row.imageUrl
        ? `<img class="${DECK_CARD_THUMB_IMG_CLASS}" src="${escapeAttr(row.imageUrl)}" alt="" ${IMG_LOADING_ATTR}="${IMG_LOADING_LAZY}" />`
        : `<span class="${DECK_CARD_THUMB_PLACEHOLDER_CLASS}">?</span>`;
    const banBadge =
        row.maxCopies != null && row.maxCopies < 3
            ? `<span class="${DECK_CARD_BAN_BADGE_CLASS}" title="${escapeAttr(deckCardBanBadgeTitle(row.maxCopies!))}">lt. ${row.maxCopies}</span>`
            : '';
    return `
            <div class="${DECK_CARD_THUMB_WRAPPER_CLASS}">${thumbHtml}</div>
            ${banBadge}
            <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_CARD_REMOVE_ONE_BTN_CLASS}" ${DATA_DECK_ACTION_ATTR}="${DECK_ACTION_REMOVE_ONE}" ${DRAGGABLE_ATTR}="${DRAGGABLE_FALSE}" ${ARIA_LABEL_ATTR}="${DECK_CARD_REMOVE_ONE_BTN_LABEL}" ${TITLE_ATTR}="${DECK_CARD_REMOVE_ONE_BTN_LABEL}">
                <svg class="${DECK_CARD_REMOVE_ONE_ICON_CLASS}" ${DECK_CARD_REMOVE_ONE_ICON_SVG_ATTRS} ${ARIA_HIDDEN_ATTR}="true">${DECK_CARD_REMOVE_ONE_PATH_HTML}</svg>
            </button>
            <span class="${DECK_CARD_QTY_CLASS}">${DECK_CARD_QTY_DISPLAY_PREFIX}${row.quantity}</span>
        `;
}
