import { describe, expect, it } from 'vitest';
import { buildAnalysisCategorySummaryDomInput } from '../analysis/categorySummaryOrchestrator.js';
import { renderAnalysisCategorySummaryTableBody } from '../analysis/categorySummaryDom.js';
import { ANALYSIS_TABLE_SECTION_ENGINES } from '../analysis/analysisTableDomSelectors.js';
import { YGO_FIRST_HAND_DRAW_COUNT } from '../analysis/yugiohDrawConstants.js';

const MAIN_ROWS = [
    {
        name: 'A',
        quantity: 2,
        engine: 'E1',
        categories: ['Starter'],
    },
];

describe('categorySummaryDom (rendu tableau)', () => {
    it('renderAnalysisCategorySummaryTableBody produit des lignes data-section engines', () => {
        const tbody = document.createElement('tbody');
        const input = buildAnalysisCategorySummaryDomInput(MAIN_ROWS, [], YGO_FIRST_HAND_DRAW_COUNT);
        renderAnalysisCategorySummaryTableBody(tbody, input);
        const engineRow = tbody.querySelector(`tr[data-section="${ANALYSIS_TABLE_SECTION_ENGINES}"]`);
        expect(engineRow).not.toBeNull();
        expect(tbody.querySelectorAll('tr').length).toBeGreaterThan(3);
    });
});
