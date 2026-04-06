import { describe, it, expect } from 'vitest';
import {
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
});
