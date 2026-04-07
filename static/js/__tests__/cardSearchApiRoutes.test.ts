import { describe, expect, it } from 'vitest';
import {
    CARD_API_NAME_QUERY,
    CARD_API_PATH,
    cardApiByNameUrl,
    SEARCH_API_PATH,
    SEARCH_API_Q_QUERY,
    searchApiUrl,
} from '../cardSearchApiRoutes.js';

describe('cardSearchApiRoutes', () => {
    it('chemins et helpers stables', () => {
        expect(CARD_API_PATH).toBe('/card');
        expect(CARD_API_NAME_QUERY).toBe('name');
        expect(SEARCH_API_PATH).toBe('/search');
        expect(SEARCH_API_Q_QUERY).toBe('q');
        expect(cardApiByNameUrl('Dark Magician')).toBe('/card?name=Dark%20Magician');
        expect(searchApiUrl('foo')).toBe('/search?q=foo');
        expect(searchApiUrl('x', '&locale=fr')).toBe('/search?q=x&locale=fr');
    });
});
