import { describe, expect, it } from 'vitest';
import { DECK_SECTION_MAIN_SIDE_SHORT_LABEL } from '../deckSectionMainSideShortCopy.js';

describe('deckSectionMainSideShortCopy', () => {
    it('libellés stables', () => {
        expect(DECK_SECTION_MAIN_SIDE_SHORT_LABEL.main).toBe('Main');
        expect(DECK_SECTION_MAIN_SIDE_SHORT_LABEL.side).toBe('Side');
    });
});
