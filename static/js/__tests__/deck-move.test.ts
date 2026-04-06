import { describe, expect, it } from 'vitest';
import {
    MAX_EXTRA_CARDS,
    MAX_MAIN_CARDS,
    MAX_SIDE_CARDS,
    MIN_MAIN_CARDS,
    isExtraDeckRowLike,
    maxCardsForZone,
    resolveTargetZone,
    sameZoneInsertIndex,
    sumQuantities,
} from '../deck-move.js';

describe('deck-move', () => {
    it('isExtraDeckRowLike détecte fusion / xyz / link / synchro', () => {
        expect(isExtraDeckRowLike({ type: 'Fusion Monster', quantity: 1 })).toBe(true);
        expect(isExtraDeckRowLike({ type: 'Spell Card', quantity: 1 })).toBe(false);
        expect(isExtraDeckRowLike({ type: 'Monster', frame_type: 'xyz', quantity: 1 })).toBe(true);
    });

    it('resolveTargetZone : non-Extra → extra = null', () => {
        const row = { type: 'Spell Card', quantity: 1 };
        expect(resolveTargetZone(row, 'extra')).toBeNull();
    });

    it('resolveTargetZone : Extra → main devient extra', () => {
        const row = { type: 'Fusion Monster', quantity: 1 };
        expect(resolveTargetZone(row, 'main')).toBe('extra');
    });

    it('resolveTargetZone : side / main valides pour carte normale', () => {
        const row = { type: 'Effect Monster', quantity: 1 };
        expect(resolveTargetZone(row, 'side')).toBe('side');
        expect(resolveTargetZone(row, 'main')).toBe('main');
    });

    it('sameZoneInsertIndex : même index → null', () => {
        expect(sameZoneInsertIndex(2, 2, 5)).toBeNull();
    });

    it('sameZoneInsertIndex : déplacer vers la droite', () => {
        expect(sameZoneInsertIndex(0, 3, 4)).toBe(2);
    });

    it('sameZoneInsertIndex : déplacer vers la gauche', () => {
        expect(sameZoneInsertIndex(3, 0, 4)).toBe(0);
    });

    it('sumQuantities et maxCardsForZone', () => {
        expect(MIN_MAIN_CARDS).toBe(40);
        expect(sumQuantities([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
        expect(maxCardsForZone('main')).toBe(MAX_MAIN_CARDS);
        expect(maxCardsForZone('extra')).toBe(MAX_EXTRA_CARDS);
        expect(maxCardsForZone('side')).toBe(MAX_SIDE_CARDS);
    });
});
