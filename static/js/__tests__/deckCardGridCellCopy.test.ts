import { describe, expect, it } from 'vitest';
import {
    DECK_CARD_THUMB_PLACEHOLDER_TEXT,
    deckCardBanBadgeVisibleLabel,
} from '../deck-builder/grid/deckCardGridCellCopy.js';

describe('deckCardGridCellCopy', () => {
    it('placeholder vignette', () => {
        expect(DECK_CARD_THUMB_PLACEHOLDER_TEXT).toBe('?');
    });

    it('deckCardBanBadgeVisibleLabel', () => {
        expect(deckCardBanBadgeVisibleLabel(1)).toBe('lt. 1');
        expect(deckCardBanBadgeVisibleLabel(2)).toBe('lt. 2');
    });
});
