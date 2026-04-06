import { describe, it, expect } from 'vitest';
import {
  CATEGORY_CHIP_REMOVE_BUTTON_TEXT,
  DROPDOWN_ARROW_TEXT,
  DROPDOWN_EMPTY_MESSAGE_TEXT,
} from '../categoryDomSelectors.js';
import { TEXT_MULTIPLICATION_SIGN } from '../utils/textPlaceholders.js';

describe('categoryDomSelectors', () => {
  it('flèche dropdown = entité HTML &#9662; (U+25BE)', () => {
    expect(DROPDOWN_ARROW_TEXT).toBe('\u25BE');
    expect(DROPDOWN_ARROW_TEXT.codePointAt(0)).toBe(0x25be);
  });

  it('puce retirer = × (U+00D7) ; message liste vide stable', () => {
    expect(CATEGORY_CHIP_REMOVE_BUTTON_TEXT).toBe(TEXT_MULTIPLICATION_SIGN);
    expect(DROPDOWN_EMPTY_MESSAGE_TEXT).toBe('Aucune option');
  });
});
