import { describe, it, expect } from 'vitest';
import { analysisHeroGroupReferenceLabel } from '../analysis/analysisCategorySummaryDomSelectors.js';

describe('analysisCategorySummaryDomSelectors', () => {
  it('analysisHeroGroupReferenceLabel forme la légende hero', () => {
    const s = analysisHeroGroupReferenceLabel('Engine A', 3, 40);
    expect(s).toContain('Engine A');
    expect(s).toContain('3');
    expect(s).toContain('40');
    expect(s).toContain('P(≥1)');
  });
});
