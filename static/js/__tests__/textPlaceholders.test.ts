import { describe, it, expect } from 'vitest';
import { TEXT_EM_DASH, TEXT_MIDDLE_DOT } from '../utils/textPlaceholders.js';

describe('textPlaceholders', () => {
  it('TEXT_EM_DASH = tiret cadratin', () => {
    expect(TEXT_EM_DASH).toBe('\u2014');
    expect(TEXT_EM_DASH.codePointAt(0)).toBe(0x2014);
  });

  it('TEXT_MIDDLE_DOT = point médian', () => {
    expect(TEXT_MIDDLE_DOT).toBe('\u00B7');
    expect(TEXT_MIDDLE_DOT.codePointAt(0)).toBe(0x00b7);
  });
});
