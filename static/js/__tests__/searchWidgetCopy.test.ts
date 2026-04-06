import { describe, expect, it } from 'vitest';
import {
    SEARCH_FETCH_ERROR_MESSAGE,
    SEARCH_RESULT_BTN_ADD_DECK_ARIA_LABEL,
    SEARCH_RESULT_BTN_ADD_DECK_TITLE,
    SEARCH_RESULT_BTN_ASSOCIATED_ARIA_LABEL,
    SEARCH_RESULT_BTN_ASSOCIATED_CAPTION,
    SEARCH_RESULT_BTN_ASSOCIATED_TITLE,
} from '../searchWidgetCopy.js';

describe('searchWidgetCopy', () => {
    it('message erreur fetch recherche stable', () => {
        expect(SEARCH_FETCH_ERROR_MESSAGE).toContain('Erreur');
        expect(SEARCH_FETCH_ERROR_MESSAGE.length).toBeGreaterThan(15);
    });

    it('titres boutons ligne résultat recherche', () => {
        expect(SEARCH_RESULT_BTN_ADD_DECK_TITLE).toContain('Main');
        expect(SEARCH_RESULT_BTN_ASSOCIATED_TITLE).toContain('associ');
        expect(SEARCH_RESULT_BTN_ASSOCIATED_CAPTION).toContain('associ');
        expect(SEARCH_RESULT_BTN_ASSOCIATED_ARIA_LABEL).toBe(SEARCH_RESULT_BTN_ASSOCIATED_TITLE);
        expect(SEARCH_RESULT_BTN_ADD_DECK_ARIA_LABEL.length).toBeLessThan(SEARCH_RESULT_BTN_ADD_DECK_TITLE.length);
    });
});
