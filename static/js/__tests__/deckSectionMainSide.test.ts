import { describe, expect, it } from 'vitest';
import {
    DECK_SECTION_MAIN_SIDE_SHORT_LABEL,
    deckSectionMainSideShortLabel,
    deckSectionMainSideSortKey,
    isDeckSectionMainSide,
} from '../deckSectionMainSide.js';

describe('deckSectionMainSide', () => {
    it('libellés stables', () => {
        expect(DECK_SECTION_MAIN_SIDE_SHORT_LABEL.main).toBe('Main');
        expect(DECK_SECTION_MAIN_SIDE_SHORT_LABEL.side).toBe('Side');
    });

    it('deckSectionMainSideShortLabel', () => {
        expect(deckSectionMainSideShortLabel('main')).toBe('Main');
        expect(deckSectionMainSideShortLabel('side')).toBe('Side');
    });

    it('isDeckSectionMainSide exclut extra', () => {
        expect(isDeckSectionMainSide('main')).toBe(true);
        expect(isDeckSectionMainSide('side')).toBe(true);
        expect(isDeckSectionMainSide('extra')).toBe(false);
        expect(isDeckSectionMainSide('')).toBe(false);
    });

    it('deckSectionMainSideSortKey ordonne Main avant Side', () => {
        expect(deckSectionMainSideSortKey('main')).toBeLessThan(deckSectionMainSideSortKey('side'));
    });
});
