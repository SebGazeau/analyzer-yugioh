import { describe, expect, it } from 'vitest';
import { buildMainDeckProbabilitySnapshot } from '../analysis/deckMainSnapshot.js';
import { buildRemainingDrawPool, pickRandomFromPool } from '../analysis/drawSimulationPile.js';

describe('drawSimulationPile', () => {
    it('buildRemainingDrawPool reflète les quantités et les tirages', () => {
        const snapshot = [
            { name: 'A', qty: 2 },
            { name: 'B', qty: 1 },
        ];
        const drawn = new Map<string, number>([['A', 1]]);
        expect(buildRemainingDrawPool(snapshot, drawn).sort()).toEqual(['A', 'B']);
    });

    it('pickRandomFromPool avec RNG fixe', () => {
        expect(pickRandomFromPool(['x', 'y', 'z'], () => 0.99)).toBe('z');
        expect(pickRandomFromPool([], () => 0.5)).toBeNull();
    });
});

describe('deckMainSnapshot', () => {
    it('filtre les lignes vides et normalise champs', () => {
        const rows = buildMainDeckProbabilitySnapshot([
            { name: '', quantity: 1, categories: [] },
            { name: 'OK', quantity: 2, engine: 'E', categories: ['c'] },
        ]);
        expect(rows).toEqual([{ name: 'OK', qty: 2, engine: 'E', categories: ['c'] }]);
    });
});
