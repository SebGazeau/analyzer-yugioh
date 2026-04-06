import { describe, expect, it } from 'vitest';
import { DROPDOWN_EMPTY_MESSAGE_TEXT } from '../categorySelectorCopy.js';

describe('categorySelectorCopy', () => {
    it('message liste vide options', () => {
        expect(DROPDOWN_EMPTY_MESSAGE_TEXT).toBe('Aucune option');
    });
});
