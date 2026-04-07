import { describe, expect, it } from 'vitest';
import { DECK_API_VALIDATION_ERRORS_JOIN } from '../deck-builder/deckApiCopy.js';

describe('deckApiCopy', () => {
    it('joint les erreurs validation comme attendu par deckApiErrorMessage', () => {
        expect(DECK_API_VALIDATION_ERRORS_JOIN).toBe(' ; ');
        expect(['a', 'b'].join(DECK_API_VALIDATION_ERRORS_JOIN)).toBe('a ; b');
    });
});
