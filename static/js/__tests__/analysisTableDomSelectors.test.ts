import { describe, it, expect } from 'vitest';
import { analysisTableSectionCollapsedClass } from '../analysis/analysisTableDomSelectors.js';

describe('analysisTableDomSelectors', () => {
  it('analysisTableSectionCollapsedClass suit le contrat CSS tableau analysis', () => {
    expect(analysisTableSectionCollapsedClass('engines')).toBe('section-engines-collapsed');
    expect(analysisTableSectionCollapsedClass('categories')).toBe('section-categories-collapsed');
  });
});
