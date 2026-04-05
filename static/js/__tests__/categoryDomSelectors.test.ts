import { describe, it, expect } from 'vitest';
import { DROPDOWN_ARROW_TEXT } from '../categoryDomSelectors.js';

describe('categoryDomSelectors', () => {
  it('flèche dropdown = entité HTML &#9662; (U+25BE)', () => {
    expect(DROPDOWN_ARROW_TEXT).toBe('\u25BE');
    expect(DROPDOWN_ARROW_TEXT.codePointAt(0)).toBe(0x25be);
  });
});
