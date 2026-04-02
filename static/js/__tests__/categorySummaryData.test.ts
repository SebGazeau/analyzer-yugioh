import { describe, expect, it } from 'vitest';
import {
    buildFullDeckCategorySummaries,
    buildRemainingDeckCategorySummaries,
    categoryEntriesSorted,
    cleanDeckCardDisplayName,
    countNameOccurrences,
    pickFirstReferenceGroup,
    remainingDrawCountForProbTable,
} from '../analysis/categorySummaryData.js';

describe('categorySummaryData', () => {
    it('cleanDeckCardDisplayName enlève le préfixe —', () => {
        expect(cleanDeckCardDisplayName('— Foo')).toBe('Foo');
    });

    it('countNameOccurrences agrège les doublons', () => {
        const m = countNameOccurrences(['A', 'B', 'A']);
        expect(m.get('A')).toBe(2);
        expect(m.get('B')).toBe(1);
    });

    it('remainingDrawCountForProbTable', () => {
        expect(remainingDrawCountForProbTable(6, 0)).toBe(6);
        expect(remainingDrawCountForProbTable(6, 3)).toBe(3);
    });

    it('buildFullDeckCategorySummaries agrège catégories et engines', () => {
        const { summary, engineSummary, totalCards } = buildFullDeckCategorySummaries([
            { name: 'C1', quantity: 2, engine: 'E1', categories: ['a', 'b'] },
            { name: 'C2', quantity: 1, engine: '', categories: ['a'] },
        ]);
        expect(totalCards).toBe(3);
        expect(Array.from(summary.a!.values()).reduce((s, v) => s + v, 0)).toBe(3);
        expect(summary.b!.get('C1')).toBe(2);
        expect(engineSummary.E1!.get('C1')).toBe(2);
        expect(Object.keys(engineSummary).length).toBe(1);
    });

    it('buildRemainingDeckCategorySummaries soustrait les tirages', () => {
        const snapshot = [
            { name: 'C1', qty: 3, engine: 'E1', categories: ['x'] },
        ];
        const drawn = new Map([['C1', 1]]);
        const { summary, totalCards } = buildRemainingDeckCategorySummaries(snapshot, drawn);
        expect(totalCards).toBe(2);
        expect(summary.x!.get('C1')).toBe(2);
    });

    it('pickFirstReferenceGroup préfère la première engine alphabétique', () => {
        const engineSummary: Record<string, Map<string, number>> = {
            Zeta: new Map([['c', 1]]),
            Alpha: new Map([['a', 2]]),
        };
        const ref = pickFirstReferenceGroup(engineSummary, {});
        expect(ref?.name).toBe('Alpha');
        expect(ref?.K).toBe(2);
    });

    it('categoryEntriesSorted filtre K > 0', () => {
        const summary: Record<string, Map<string, number>> = {
            z: new Map([['c', 0]]),
            a: new Map([['c', 2]]),
        };
        expect(categoryEntriesSorted(summary)).toEqual([{ name: 'a', K: 2 }]);
    });
});
