import { describe, expect, it } from 'vitest';
import { computeMainDeckTypeCounts } from '../analysis/mainDeckTypeCounts.js';

describe('mainDeckTypeCounts', () => {
    it('agrège par type (insensible à la casse)', () => {
        expect(
            computeMainDeckTypeCounts([
                { type: 'Effect Monster', quantity: 2 },
                { type: 'Spell Card', quantity: 3 },
                { type: 'Trap Card', quantity: 1 },
            ]),
        ).toEqual({ monsters: 2, spells: 3, traps: 1 });
    });

    it('ignore les lignes sans type reconnu', () => {
        expect(computeMainDeckTypeCounts([{ type: 'Token', quantity: 5 }])).toEqual({
            monsters: 0,
            spells: 0,
            traps: 0,
        });
    });
});
