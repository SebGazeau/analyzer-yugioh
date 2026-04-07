import { describe, it, expect } from 'vitest';
import {
  TEXT_BLACK_STAR,
  TEXT_ELLIPSIS,
  TEXT_EM_DASH,
  TEXT_EN_DASH,
  TEXT_GUILLEMET_CLOSE,
  TEXT_GUILLEMET_OPEN,
  TEXT_MIDDLE_DOT,
  TEXT_MULTIPLICATION_SIGN,
  TEXT_PERCENT_SIGN,
} from '../utils/textPlaceholders.js';

describe('textPlaceholders', () => {
  it('TEXT_EM_DASH = tiret cadratin', () => {
    expect(TEXT_EM_DASH).toBe('\u2014');
    expect(TEXT_EM_DASH.codePointAt(0)).toBe(0x2014);
  });

  it('TEXT_EN_DASH = tiret demi-cadratin', () => {
    expect(TEXT_EN_DASH).toBe('\u2013');
    expect(TEXT_EN_DASH.codePointAt(0)).toBe(0x2013);
  });

  it('TEXT_MIDDLE_DOT = point médian', () => {
    expect(TEXT_MIDDLE_DOT).toBe('\u00B7');
    expect(TEXT_MIDDLE_DOT.codePointAt(0)).toBe(0x00b7);
  });

  it('TEXT_MULTIPLICATION_SIGN = ×', () => {
    expect(TEXT_MULTIPLICATION_SIGN).toBe('\u00D7');
  });

  it('TEXT_BLACK_STAR = ★', () => {
    expect(TEXT_BLACK_STAR).toBe('\u2605');
  });

  it('TEXT_ELLIPSIS = …', () => {
    expect(TEXT_ELLIPSIS).toBe('\u2026');
  });

  it('guillemets français', () => {
    expect(TEXT_GUILLEMET_OPEN).toBe('\u00AB');
    expect(TEXT_GUILLEMET_CLOSE).toBe('\u00BB');
  });

  it('TEXT_PERCENT_SIGN = pourcent', () => {
    expect(TEXT_PERCENT_SIGN).toBe('%');
    expect(TEXT_PERCENT_SIGN.codePointAt(0)).toBe(0x0025);
  });
});
