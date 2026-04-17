import { describe, expect, it } from 'vitest';
import {
    fidraulisAggregateLitPopDots,
    fidraulisAggregatePopDotLow,
} from '../../insights/fidraulisAggregatePopularity.js';

describe('fidraulisAggregateLitPopDots', () => {
    it('mappe linéairement le score sur 0–5 pastilles', () => {
        const batch = [0, 10, 20, 30, 40];
        expect(fidraulisAggregateLitPopDots(0, batch)).toBe(0);
        expect(fidraulisAggregateLitPopDots(40, batch)).toBe(5);
        expect(fidraulisAggregateLitPopDots(20, batch)).toBe(3);
    });

    it('lot à score unique : tout ou rien selon score > 0', () => {
        expect(fidraulisAggregateLitPopDots(7, [7, 7, 7])).toBe(5);
        expect(fidraulisAggregateLitPopDots(0, [0, 0])).toBe(0);
    });
});

describe('fidraulisAggregatePopDotLow', () => {
    it('active le style prudence si peu de pastilles et biais heuristique', () => {
        expect(fidraulisAggregatePopDotLow(2, 0, 3)).toBe(true);
        expect(fidraulisAggregatePopDotLow(3, 0, 3)).toBe(false);
        expect(fidraulisAggregatePopDotLow(2, 5, 1)).toBe(false);
    });
});
