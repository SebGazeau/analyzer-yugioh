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
    DECK_CARD_POPOVER_CATEGORIES_LABEL_ID,
    DECK_CARD_POPOVER_CATEGORIES_LABEL_TEXT_CLASS,
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
                        <div class="${DECK_CARD_POPOVER_FIELD_LABEL_CLASS} ${DECK_CARD_POPOVER_FIELD_LABEL_STACK_CLASS}">
                            <span id="${DECK_CARD_POPOVER_CATEGORIES_LABEL_ID}" class="${DECK_CARD_POPOVER_CATEGORIES_LABEL_TEXT_CLASS}">${escapeHtml(DECK_CARD_POPOVER_LABEL_CATEGORIES)}</span>
                            <div class="${DECK_CARD_POPOVER_CAT_CONTAINER_CLASS}"></div>
                        </div>
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
