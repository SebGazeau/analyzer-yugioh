import { describe, expect, it } from 'vitest';
import { buildAnalysisCategorySummaryDomInput } from '../analysis/categorySummaryOrchestrator.js';

const MAIN_ROWS = [
    {
        name: 'A',
        quantity: 2,
        engine: 'E1',
        categories: ['Starter'],
    },
];

describe('categorySummaryOrchestrator', () => {
    it('sans tirages : pas de bandeau, numDraws = handSize', () => {
        const input = buildAnalysisCategorySummaryDomInput(MAIN_ROWS, [], 6);
        expect(input.simulationBanner).toBeNull();
        expect(input.handSize).toBe(6);
        expect(input.numDraws).toBe(6);
        expect(input.totalCards).toBe(2);
        expect(input.summary.Starter?.get('A')).toBe(2);
    });

    it('avec tirages : bandeau et deck restant', () => {
        const input = buildAnalysisCategorySummaryDomInput(MAIN_ROWS, ['A'], 6);
        expect(input.simulationBanner).toContain('Simulation');
        expect(input.totalCards).toBe(1);
        expect(input.summary.Starter?.get('A')).toBe(1);
    });
});
