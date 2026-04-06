import { describe, expect, it } from 'vitest';
import {
    SEARCH_FILTER_ALL,
    SEARCH_FILTER_MONSTER,
    SEARCH_FILTER_SPELL,
    SEARCH_FILTER_TRAP,
} from '../searchFilterConstants.js';

describe('searchFilterConstants', () => {
    it('valeurs alignées sur data-search-filter (search-card.html)', () => {
        expect(SEARCH_FILTER_ALL).toBe('all');
        expect(SEARCH_FILTER_MONSTER).toBe('monster');
        expect(SEARCH_FILTER_SPELL).toBe('spell');
        expect(SEARCH_FILTER_TRAP).toBe('trap');
    });
});
