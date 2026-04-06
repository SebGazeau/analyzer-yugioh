/**
 * Attributs `data-*` et sélecteurs pour l’UI insights / onglet Suggestions.
 */

export const INSIGHTS_NAV_TAB_DATA_ATTR = 'data-nav-insights-tab';
export const INSIGHTS_SUMMARY_TBODY_DATA_ATTR = 'data-insights-summary-tbody';
export const INSIGHTS_DETAIL_TBODY_DATA_ATTR = 'data-insights-detail-tbody';
export const INSIGHTS_NUMBER_TBODY_DATA_ATTR = 'data-insights-number-tbody';
export const INSIGHTS_PAGE_HELP_DATA_ATTR = 'data-insights-page-help';
export const SUGGESTIONS_DETAIL_WRAP_DATA_ATTR = 'data-suggestions-detail-wrap';
export const SUGGESTIONS_NUMBER_WRAP_DATA_ATTR = 'data-suggestions-number-wrap';

function dataSelector(dataAttr: string): string {
    return `[${dataAttr}]`;
}

export const INSIGHTS_NAV_TAB_SELECTOR = dataSelector(INSIGHTS_NAV_TAB_DATA_ATTR);
export const INSIGHTS_SUMMARY_TBODY_SELECTOR = dataSelector(INSIGHTS_SUMMARY_TBODY_DATA_ATTR);
export const INSIGHTS_DETAIL_TBODY_SELECTOR = dataSelector(INSIGHTS_DETAIL_TBODY_DATA_ATTR);
export const INSIGHTS_NUMBER_TBODY_SELECTOR = dataSelector(INSIGHTS_NUMBER_TBODY_DATA_ATTR);
export const INSIGHTS_PAGE_HELP_SELECTOR = dataSelector(INSIGHTS_PAGE_HELP_DATA_ATTR);
export const SUGGESTIONS_DETAIL_WRAP_SELECTOR = dataSelector(SUGGESTIONS_DETAIL_WRAP_DATA_ATTR);
export const SUGGESTIONS_NUMBER_WRAP_SELECTOR = dataSelector(SUGGESTIONS_NUMBER_WRAP_DATA_ATTR);

/** Lignes / cellules générées dans {@link panel.ts} (alignées sur templates Suggestions). */
export const INSIGHTS_SUMMARY_ROW_DATA_ATTR = 'data-insights-summary-row';
export const INSIGHTS_KIND_DATA_ATTR = 'data-insights-kind';
export const INSIGHTS_SEVERITY_DATA_ATTR = 'data-insights-severity';
export const INSIGHTS_CELL_DATA_ATTR = 'data-insights-cell';

export const INSIGHTS_EMPTY_CELL_DATA_ATTR = 'data-insights-empty-cell';
export const INSIGHTS_MAIN_MATCHES_DATA_ATTR = 'data-insights-main-matches';
export const INSIGHTS_MATCH_THUMB_DATA_ATTR = 'data-insights-match-thumb';
export const INSIGHTS_MAIN_MATCH_DATA_ATTR = 'data-insights-main-match';

export const INSIGHTS_ADD_DECK_CARD_DATA_ATTR = 'data-insights-add-deck-card';
export const INSIGHTS_CARD_NAME_DATA_ATTR = 'data-insights-card-name';
export const INSIGHTS_SECTION_DATA_ATTR = 'data-insights-section';

export const INSIGHTS_SUGGEST_ROW_DATA_ATTR = 'data-insights-suggest-row';
export const INSIGHTS_MATCHES_MAIN_DATA_ATTR = 'data-insights-matches-main';
export const INSIGHTS_SUGGEST_NAME_DATA_ATTR = 'data-insights-suggest-name';
export const INSIGHTS_FIND_CARD_DATA_ATTR = 'data-insights-find-card';

export const INSIGHTS_DETAIL_ROW_DATA_ATTR = 'data-insights-detail-row';
export const INSIGHTS_CARD_LINE_DATA_ATTR = 'data-insights-card-line';

export const INSIGHTS_FIND_CARD_SELECTOR = dataSelector(INSIGHTS_FIND_CARD_DATA_ATTR);
export const INSIGHTS_ADD_DECK_CARD_SELECTOR = dataSelector(INSIGHTS_ADD_DECK_CARD_DATA_ATTR);
export const INSIGHTS_SUGGEST_ROW_SELECTOR = dataSelector(INSIGHTS_SUGGEST_ROW_DATA_ATTR);

/** Classes CSS générées dans {@link panel.ts} (alignées sur `static/css`). */
export const SUGGESTIONS_MAIN_MATCHES_CLASS = 'suggestions-main-matches';
export const SUGGESTIONS_MAIN_MATCH_QTY_CLASS = 'suggestions-main-match-qty';
export const SUGGESTIONS_MAIN_MATCH_SECTION_CLASS = 'suggestions-main-match-section';
export const SUGGESTIONS_MAIN_MATCH_THUMB_CLASS = 'suggestions-main-match-thumb';
export const SUGGESTIONS_MAIN_MATCH_THUMB_EMPTY_CLASS = `${SUGGESTIONS_MAIN_MATCH_THUMB_CLASS}--empty`;
export const SUGGESTIONS_MAIN_MATCH_CHIP_CLASS = 'suggestions-main-match-chip';
export const SUGGESTIONS_MAIN_MATCH_NAME_CLASS = 'suggestions-main-match-name';
export const SUGGESTIONS_TARGET_LIST_CLASS = 'suggestions-target-list';

/** Bouton « Chercher » (ligne Number Xyz) : combo utility + deck button. */
export const INSIGHTS_FIND_CARD_BUTTON_CLASS = 'btn btn-deck btn-deck-ghost btn-sm';

export function suggestionsMainMatchThumbEmptyClassName(): string {
    return `${SUGGESTIONS_MAIN_MATCH_THUMB_CLASS} ${SUGGESTIONS_MAIN_MATCH_THUMB_EMPTY_CLASS}`;
}

export {
    INSIGHTS_FIND_CARD_BUTTON_LABEL,
    INSIGHTS_FIND_CARD_BUTTON_TITLE,
    INSIGHTS_MAIN_MATCH_THUMB_PLACEHOLDER_TEXT,
    INSIGHTS_NUMBER_SUGGESTION_ATTR_RACE_SEPARATOR,
    INSIGHTS_SUGGEST_ROW_TITLE,
    insightsMainMatchChipTitle,
    insightsMainMatchQtyAriaLabel,
} from './insightsSuggestionsUiCopy.js';
