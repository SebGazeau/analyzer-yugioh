/**
 * HTML des chips « cartes du deck qui matchent » (tableau Number XYZ, onglet Suggestions).
 */

import { deckSectionMainSideShortLabel } from '../deckSection.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from '../utils/ariaAttrs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import {
    IMG_LOADING_ATTR,
    IMG_LOADING_LAZY,
    ROLE_ATTR,
    ROLE_BUTTON,
    TABINDEX_ATTR,
    TABINDEX_ZERO,
    TITLE_ATTR,
} from '../utils/htmlAttrs.js';
import { TEXT_EM_DASH, TEXT_MULTIPLICATION_SIGN } from '../utils/textPlaceholders.js';
import {
    INSIGHTS_ADD_DECK_CARD_DATA_ATTR,
    INSIGHTS_CARD_NAME_DATA_ATTR,
    INSIGHTS_EMPTY_CELL_DATA_ATTR,
    INSIGHTS_MAIN_MATCH_DATA_ATTR,
    INSIGHTS_MAIN_MATCHES_DATA_ATTR,
    INSIGHTS_MATCH_THUMB_DATA_ATTR,
    INSIGHTS_SECTION_DATA_ATTR,
    SUGGESTIONS_MAIN_MATCH_CHIP_CLASS,
    SUGGESTIONS_MAIN_MATCH_NAME_CLASS,
    SUGGESTIONS_MAIN_MATCH_QTY_CLASS,
    SUGGESTIONS_MAIN_MATCH_SECTION_CLASS,
    SUGGESTIONS_MAIN_MATCH_THUMB_CLASS,
    SUGGESTIONS_MAIN_MATCHES_CLASS,
    insightsMainMatchChipTitle,
    insightsMainMatchQtyAriaLabel,
    suggestionsMainMatchThumbEmptyClassName,
} from './insightsDomSelectors.js';
import type { MatchingCardPreview } from './types.js';

const INSIGHTS_MAIN_MATCH_THUMB_WIDTH = 44;
const INSIGHTS_MAIN_MATCH_THUMB_HEIGHT = 64;

/** Cellule de tableau : liste de chips ou tiret si vide. */
export function insightsMainMatchChipsHtml(cards: MatchingCardPreview[]): string {
    if (cards.length === 0) return `<span ${INSIGHTS_EMPTY_CELL_DATA_ATTR}>${TEXT_EM_DASH}</span>`;
    return `<div class="${SUGGESTIONS_MAIN_MATCHES_CLASS}" ${INSIGHTS_MAIN_MATCHES_DATA_ATTR}>${cards
        .map((c) => {
            const nameEsc = escapeHtml(c.name);
            const nameAttr = escapeAttr(c.name);
            const qty =
                c.quantity > 1
                    ? `<span class="${SUGGESTIONS_MAIN_MATCH_QTY_CLASS}" ${ARIA_LABEL_ATTR}="${escapeAttr(insightsMainMatchQtyAriaLabel(c.quantity))}">${TEXT_MULTIPLICATION_SIGN}${c.quantity}</span>`
                    : '';
            const sectionBadge = `<span class="${SUGGESTIONS_MAIN_MATCH_SECTION_CLASS}" ${INSIGHTS_SECTION_DATA_ATTR}="${c.section}">${escapeHtml(deckSectionMainSideShortLabel(c.section))}</span>`;
            const thumb =
                c.imageUrl && c.imageUrl.trim() !== ''
                    ? `<img class="${SUGGESTIONS_MAIN_MATCH_THUMB_CLASS}" src="${escapeAttr(c.imageUrl)}" alt="" width="${INSIGHTS_MAIN_MATCH_THUMB_WIDTH}" height="${INSIGHTS_MAIN_MATCH_THUMB_HEIGHT}" ${IMG_LOADING_ATTR}="${IMG_LOADING_LAZY}" ${INSIGHTS_MATCH_THUMB_DATA_ATTR} />`
                    : `<span class="${suggestionsMainMatchThumbEmptyClassName()}" ${INSIGHTS_MATCH_THUMB_DATA_ATTR} ${ARIA_HIDDEN_ATTR}="true">?</span>`;
            return `<div class="${SUGGESTIONS_MAIN_MATCH_CHIP_CLASS}" ${INSIGHTS_MAIN_MATCH_DATA_ATTR} ${INSIGHTS_ADD_DECK_CARD_DATA_ATTR}="1" ${INSIGHTS_CARD_NAME_DATA_ATTR}="${nameAttr}" ${INSIGHTS_SECTION_DATA_ATTR}="${c.section}" ${TITLE_ATTR}="${insightsMainMatchChipTitle(deckSectionMainSideShortLabel(c.section))}" ${ROLE_ATTR}="${ROLE_BUTTON}" ${TABINDEX_ATTR}="${TABINDEX_ZERO}">
        ${thumb}
        <span class="${SUGGESTIONS_MAIN_MATCH_NAME_CLASS}">${nameEsc}</span>
        ${sectionBadge}
        ${qty}
      </div>`;
        })
        .join('')}</div>`;
}
