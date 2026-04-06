import { describe, expect, it } from 'vitest';
import { PERCENT_DISPLAY_SCALE } from '../utils/percentScale.js';

describe('percentScale', () => {
  it('échelle affichage pourcentage', () => {
    expect(PERCENT_DISPLAY_SCALE).toBe(100);
  });
});
