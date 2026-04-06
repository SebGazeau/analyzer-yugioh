/**
 * HTML du corps d’une carte « Mes decks » (nom, méta date, actions dupliquer / supprimer).
 */

import {
    DATA_DECK_DELETE_ATTR,
    DATA_DECK_DUPLICATE_ATTR,
    DECK_SAVED_ITEM_ACTIONS_CLASS,
    DECK_SAVED_ITEM_DELETE_BTN_TITLE,
    DECK_SAVED_ITEM_DELETE_CLASS,
    DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE,
    DECK_SAVED_ITEM_DUPLICATE_CLASS,
    DECK_SAVED_ITEM_FOOTER_CLASS,
    DECK_SAVED_ITEM_META_CLASS,
    DECK_SAVED_ITEM_NAME_CLASS,
    htmlDeckSavedItemDeleteActionSvg,
    htmlDeckSavedItemDuplicateActionSvg,
} from './deckSavedListDomSelectors.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON, TITLE_ATTR } from '../utils/htmlAttrs.js';
import { escapeHtml, formatDeckDate } from '../utils/html.js';

export type DeckSavedListItemBodyParams = {
    deckName: string;
    deckId: number | string;
    /** ISO ou chaîne passée à `formatDeckDate` ; absente → pas de ligne méta. */
    createdAtIso?: string | null;
};

export function deckSavedListItemBodyInnerHtml(p: DeckSavedListItemBodyParams): string {
    const meta = p.createdAtIso
        ? `<span class="${DECK_SAVED_ITEM_META_CLASS}">${escapeHtml(formatDeckDate(p.createdAtIso))}</span>`
        : '';
    const copySvg = htmlDeckSavedItemDuplicateActionSvg();
    const trashSvg = htmlDeckSavedItemDeleteActionSvg();
    const idAttr = String(p.deckId);
    return `<span class="${DECK_SAVED_ITEM_NAME_CLASS}">${escapeHtml(p.deckName)}</span><div class="${DECK_SAVED_ITEM_FOOTER_CLASS}">${meta}<div class="${DECK_SAVED_ITEM_ACTIONS_CLASS}"><button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_SAVED_ITEM_DUPLICATE_CLASS}" ${DATA_DECK_DUPLICATE_ATTR}="${idAttr}" ${TITLE_ATTR}="${DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE}">${copySvg}</button><button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_SAVED_ITEM_DELETE_CLASS}" ${DATA_DECK_DELETE_ATTR}="${idAttr}" ${TITLE_ATTR}="${DECK_SAVED_ITEM_DELETE_BTN_TITLE}">${trashSvg}</button></div></div>`;
}
