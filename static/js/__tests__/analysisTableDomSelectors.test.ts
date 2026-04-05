import { describe, it, expect } from 'vitest';
import {
  ANALYSIS_SECTION_HEADER_TOGGLE_TEXT,
  ANALYSIS_TABLE_BODY_COLSPAN,
  analysisTableSectionCollapsedClass,
} from '../analysis/analysisTableDomSelectors.js';

describe('analysisTableDomSelectors', () => {
  it('analysisTableSectionCollapsedClass suit le contrat CSS tableau analysis', () => {
    expect(analysisTableSectionCollapsedClass('engines')).toBe('section-engines-collapsed');
    expect(analysisTableSectionCollapsedClass('categories')).toBe('section-categories-collapsed');
  });

  it('colspan corps tableau aligné sur le template analysis (9 colonnes)', () => {
    expect(ANALYSIS_TABLE_BODY_COLSPAN).toBe(9);
  });

  it('toggle section : triangle bas U+25BC', () => {
    expect(ANALYSIS_SECTION_HEADER_TOGGLE_TEXT).toBe('\u25BC');
    expect(ANALYSIS_SECTION_HEADER_TOGGLE_TEXT.codePointAt(0)).toBe(0x25bc);
  });
});
