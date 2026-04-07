import { describe, expect, it } from 'vitest';
import {
    SEARCH_RESULT_THUMB_LETTER_MONSTER,
    SEARCH_RESULT_THUMB_LETTER_SPELL,
    SEARCH_RESULT_THUMB_LETTER_TRAP,
} from '../searchResultThumbCopy.js';

describe('searchResultThumbCopy', () => {
    it('lettres M / S / T', () => {
        expect(SEARCH_RESULT_THUMB_LETTER_MONSTER).toBe('M');
        expect(SEARCH_RESULT_THUMB_LETTER_SPELL).toBe('S');
        expect(SEARCH_RESULT_THUMB_LETTER_TRAP).toBe('T');
    });
});
