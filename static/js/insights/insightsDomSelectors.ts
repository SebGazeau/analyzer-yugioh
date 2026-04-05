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
