/**
 * Conteneurs de page (`data-page`) — alignés sur les onglets / templates.
 */

import { TAB_ID_ANALYSIS, TAB_ID_BUILDER, TAB_ID_DECKS } from './tabs.js';

export const DATA_PAGE_ATTR = 'data-page';

function dataPageSelector(pageId: string): string {
    return `[${DATA_PAGE_ATTR}="${pageId}"]`;
}

export const PAGE_BUILDER_SELECTOR = dataPageSelector(TAB_ID_BUILDER);
export const PAGE_DECKS_SELECTOR = dataPageSelector(TAB_ID_DECKS);
export const PAGE_ANALYSIS_SELECTOR = dataPageSelector(TAB_ID_ANALYSIS);
