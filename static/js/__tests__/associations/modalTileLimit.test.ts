import { describe, expect, it } from 'vitest';
import {
    ASSOCIATIONS_MODAL_TILES_INITIAL,
    splitAssociationTileIdsForDisplay,
} from '../../associations/modalTileLimit.js';

describe('splitAssociationTileIdsForDisplay', () => {
    it('retourne tout dans visible si sous le plafond', () => {
        const ids = Array.from({ length: 10 }, (_, i) => i + 1);
        const r = splitAssociationTileIdsForDisplay(ids, 48);
        expect(r.visible).toEqual(ids);
        expect(r.rest).toEqual([]);
    });

    it('sépare visible / rest au-delà du plafond', () => {
        const ids = Array.from({ length: 50 }, (_, i) => i + 1);
        const r = splitAssociationTileIdsForDisplay(ids, ASSOCIATIONS_MODAL_TILES_INITIAL);
        expect(r.visible).toHaveLength(48);
        expect(r.rest).toHaveLength(2);
        expect(r.visible[47]).toBe(48);
        expect(r.rest[0]).toBe(49);
    });

    it('initialMax <= 0 met tout dans rest', () => {
        const r = splitAssociationTileIdsForDisplay([1, 2, 3], 0);
        expect(r.visible).toEqual([]);
        expect(r.rest).toEqual([1, 2, 3]);
    });
});
