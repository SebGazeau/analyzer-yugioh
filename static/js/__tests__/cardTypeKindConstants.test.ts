import { describe, expect, it } from 'vitest';
import {
    SEARCH_FILTER_MONSTER,
    SEARCH_FILTER_SPELL,
    SEARCH_FILTER_TRAP,
} from '../searchFilterConstants.js';
import {
    CARD_TYPE_KIND_MONSTER,
    CARD_TYPE_KIND_SPELL,
    CARD_TYPE_KIND_TRAP,
} from '../utils/cardTypeKindConstants.js';

describe('cardTypeKindConstants', () => {
    it('identique aux filtres recherche monster/spell/trap', () => {
        expect(SEARCH_FILTER_MONSTER).toBe(CARD_TYPE_KIND_MONSTER);
        expect(SEARCH_FILTER_SPELL).toBe(CARD_TYPE_KIND_SPELL);
        expect(SEARCH_FILTER_TRAP).toBe(CARD_TYPE_KIND_TRAP);
    });

    it('valeurs stables (contrat API + templates)', () => {
        expect(CARD_TYPE_KIND_MONSTER).toBe('monster');
        expect(CARD_TYPE_KIND_SPELL).toBe('spell');
        expect(CARD_TYPE_KIND_TRAP).toBe('trap');
    });
});
