import { describe, expect, it } from 'vitest';
import {
    CATEGORY_CHIP_REMOVE_BUTTON_TEXT,
    DROPDOWN_ARROW_TEXT,
    DROPDOWN_EMPTY_MESSAGE_TEXT,
} from '../categorySelectorCopy.js';
import { TEXT_MULTIPLICATION_SIGN } from '../utils/textPlaceholders.js';

describe('categorySelectorCopy', () => {
    it('message liste vide options', () => {
        expect(DROPDOWN_EMPTY_MESSAGE_TEXT).toBe('Aucune option');
    });

    it('flèche dropdown = entité HTML &#9662; (U+25BE)', () => {
        expect(DROPDOWN_ARROW_TEXT).toBe('\u25BE');
        expect(DROPDOWN_ARROW_TEXT.codePointAt(0)).toBe(0x25be);
    });

    it('puce retirer = × (U+00D7)', () => {
        expect(CATEGORY_CHIP_REMOVE_BUTTON_TEXT).toBe(TEXT_MULTIPLICATION_SIGN);
    });
});
