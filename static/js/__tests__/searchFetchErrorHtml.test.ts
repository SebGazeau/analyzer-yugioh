import { describe, expect, it } from 'vitest';
import { DATA_SEARCH_ERROR_ATTR, SEARCH_ERROR_STATE_CLASS, SEARCH_FETCH_ERROR_MESSAGE } from '../searchDomSelectors.js';
import { searchResultsFetchErrorRowHtml } from '../searchFetchErrorHtml.js';

describe('searchResultsFetchErrorRowHtml', () => {
    it('classe, attribut data et message échappé', () => {
        const html = searchResultsFetchErrorRowHtml();
        expect(html).toContain(`class="${SEARCH_ERROR_STATE_CLASS}"`);
        expect(html).toContain(`${DATA_SEARCH_ERROR_ATTR}="true"`);
        expect(html).toContain(SEARCH_FETCH_ERROR_MESSAGE);
    });
});
