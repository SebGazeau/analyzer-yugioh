import { describe, expect, it } from 'vitest';
import { DECK_API_COLLECTION_URL, deckApiDeckByIdUrl } from '../deck-builder/deckApiRoutes.js';

describe('deckApiRoutes', () => {
    it('collection et ressource par id', () => {
        expect(DECK_API_COLLECTION_URL).toBe('/decks');
        expect(deckApiDeckByIdUrl(42)).toBe('/decks/42');
    });
});
