import { describe, it, expect } from 'vitest';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

describe('textPlaceholders', () => {
  it('TEXT_EM_DASH = tiret cadratin', () => {
    expect(TEXT_EM_DASH).toBe('\u2014');
    expect(TEXT_EM_DASH.codePointAt(0)).toBe(0x2014);
  });
});
