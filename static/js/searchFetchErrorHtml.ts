/**
 * Fragment HTML affiché dans la liste de résultats quand `/search` échoue.
 */

import { DATA_SEARCH_ERROR_ATTR, SEARCH_ERROR_STATE_CLASS, SEARCH_FETCH_ERROR_MESSAGE } from './searchDomSelectors.js';
import { escapeHtml } from './utils/html.js';

/** Une ligne d’erreur (remplace le contenu de `#search-results-list`). */
export function searchResultsFetchErrorRowHtml(): string {
    return `<div class="${SEARCH_ERROR_STATE_CLASS}" ${DATA_SEARCH_ERROR_ATTR}="true">${escapeHtml(SEARCH_FETCH_ERROR_MESSAGE)}</div>`;
}
