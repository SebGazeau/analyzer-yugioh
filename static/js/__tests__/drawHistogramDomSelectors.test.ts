import { describe, it, expect } from 'vitest';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';
import {
  DRAW_HISTOGRAM_CATEGORY_FILL_VARS,
  DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY,
  DRAW_HISTOGRAM_SIM_ITERATIONS,
  drawHistogramContainerAriaLabel,
  drawHistogramHeadingActive,
  drawHistogramHeadingIdle,
} from '../analysis/drawHistogramDomSelectors.js';

describe('drawHistogramDomSelectors', () => {
  it('palette mini-histogrammes = variables CSS tokens', () => {
    expect(DRAW_HISTOGRAM_CATEGORY_FILL_VARS.length).toBeGreaterThan(0);
    expect(DRAW_HISTOGRAM_CATEGORY_FILL_VARS[0]).toBe('var(--color-zone-main)');
    for (const v of DRAW_HISTOGRAM_CATEGORY_FILL_VARS) {
      expect(v).toMatch(/^var\(--color-/);
    }
  });

  it('itérations + libellés UI histogramme stables', () => {
    expect(DRAW_HISTOGRAM_SIM_ITERATIONS).toBe(1000);
    expect(drawHistogramHeadingIdle(1000)).toBe('Distribution (1000 tirages)');
    expect(drawHistogramHeadingActive(1000, 'Starter')).toContain('Starter');
    expect(drawHistogramContainerAriaLabel(1000, 'X')).toContain('1000');
    expect(DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY).toContain('Aucune');
    expect(DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY.split(TEXT_EM_DASH).length - 1).toBe(2);
    expect(drawHistogramHeadingActive(1000, 'X').includes(TEXT_EM_DASH)).toBe(true);
  });
});
