import { describe, expect, it } from 'vitest';
import {
    DECK_CARD_REMOVE_ONE_BTN_LABEL,
    DECK_CARD_THUMB_PLACEHOLDER_TEXT,
    deckCardBanBadgeTitle,
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

    it('deckCardBanBadgeTitle + libellé bouton retirer 1', () => {
        expect(deckCardBanBadgeTitle(1)).toContain('1');
        expect(deckCardBanBadgeTitle(1)).toContain('Banlist');
        expect(DECK_CARD_REMOVE_ONE_BTN_LABEL).toContain('1 exemplaire');
    });
});
