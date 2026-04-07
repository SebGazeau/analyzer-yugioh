import { describe, expect, it } from 'vitest';
import { buildAnalysisCategorySummaryDomInput } from '../analysis/categorySummaryOrchestrator.js';
import { YGO_SECOND_HAND_DRAW_COUNT } from '../analysis/yugiohDrawConstants.js';

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
        const input = buildAnalysisCategorySummaryDomInput(MAIN_ROWS, [], YGO_SECOND_HAND_DRAW_COUNT);
        expect(input.simulationBanner).toBeNull();
        expect(input.handSize).toBe(YGO_SECOND_HAND_DRAW_COUNT);
        expect(input.numDraws).toBe(YGO_SECOND_HAND_DRAW_COUNT);
        expect(input.totalCards).toBe(2);
        expect(input.summary.Starter?.get('A')).toBe(2);
    });

    it('avec tirages : bandeau et deck restant', () => {
        const input = buildAnalysisCategorySummaryDomInput(MAIN_ROWS, ['A'], YGO_SECOND_HAND_DRAW_COUNT);
        expect(input.simulationBanner).toContain('Simulation');
        expect(input.totalCards).toBe(1);
        expect(input.summary.Starter?.get('A')).toBe(1);
    });
});
