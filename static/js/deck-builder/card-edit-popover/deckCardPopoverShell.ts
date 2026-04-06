/**
 * Structure statique du dialogue « Modifier la carte » (deck builder).
 * Les libellés et la hiérarchie DOM restent ici ; la logique vit dans deck.ts.
 */
import {
    DECK_CARD_POPOVER_ACTIONS_CLASS,
    DECK_CARD_POPOVER_CAT_CONTAINER_CLASS,
    DECK_CARD_POPOVER_CATS_CLASS,
    DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_CLOSE_BTN_TITLE,
    DECK_CARD_POPOVER_CLOSE_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_COVER_BTN_TITLE,
    DECK_CARD_POPOVER_COVER_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_DELETE_BTN_TITLE,
    DECK_CARD_POPOVER_DELETE_FULL_BTN_CLASS,
    DECK_CARD_POPOVER_ENGINE_CLASS,
    DECK_CARD_POPOVER_ICON_CLASS,
    DECK_CARD_POPOVER_ICON_SVG_ATTRS,
    DECK_CARD_POPOVER_INNER_CLASS,
    DECK_CARD_POPOVER_QTY_CLASS,
    DECK_CARD_POPOVER_ROW_CLASS,
    DECK_CARD_POPOVER_SVG_COVER_INNER_HTML,
    DECK_CARD_POPOVER_HEADING_TEXT,
    DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML,
    DECK_CARD_POPOVER_SVG_PATH_CLOSE_D,
    DECK_CARD_POPOVER_TITLE_CLASS,
} from './deckCardPopoverDomSelectors.js';
import {
    DECK_CARD_POPOVER_ENGINE_CHOICES,
    DECK_CARD_POPOVER_ENGINE_OPTION_EMPTY_LABEL,
    DECK_CARD_POPOVER_LABEL_CATEGORIES,
    DECK_CARD_POPOVER_LABEL_ENGINE,
    DECK_CARD_POPOVER_LABEL_QTY,
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
            <h4 class="${DECK_CARD_POPOVER_TITLE_CLASS}">${DECK_CARD_POPOVER_HEADING_TEXT}</h4>
            <div class="${DECK_CARD_POPOVER_ROW_CLASS}">
                <label>${escapeHtml(DECK_CARD_POPOVER_LABEL_QTY)}</label>
                <select class="${DECK_CARD_POPOVER_QTY_CLASS}">
                    ${deckCardPopoverQtyOptionsHtml}
                </select>
            </div>
            <div class="${DECK_CARD_POPOVER_ROW_CLASS}">
                <label>${escapeHtml(DECK_CARD_POPOVER_LABEL_ENGINE)}</label>
                <select class="${DECK_CARD_POPOVER_ENGINE_CLASS}">
                    ${deckCardPopoverEngineOptionsHtml}
                </select>
            </div>
            <div class="${DECK_CARD_POPOVER_ROW_CLASS} ${DECK_CARD_POPOVER_CATS_CLASS}">
                <label>${escapeHtml(DECK_CARD_POPOVER_LABEL_CATEGORIES)}</label>
                <div class="${DECK_CARD_POPOVER_CAT_CONTAINER_CLASS}"></div>
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
            </div>
        </div>
    `;
