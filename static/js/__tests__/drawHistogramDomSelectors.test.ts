import { describe, it, expect } from 'vitest';
import { DRAW_HISTOGRAM_CATEGORY_FILL_VARS } from '../analysis/drawHistogramDomSelectors.js';

describe('drawHistogramDomSelectors', () => {
  it('palette mini-histogrammes = variables CSS tokens', () => {
    expect(DRAW_HISTOGRAM_CATEGORY_FILL_VARS.length).toBeGreaterThan(0);
    expect(DRAW_HISTOGRAM_CATEGORY_FILL_VARS[0]).toBe('var(--color-zone-main)');
    for (const v of DRAW_HISTOGRAM_CATEGORY_FILL_VARS) {
      expect(v).toMatch(/^var\(--color-/);
    }
  });
});
