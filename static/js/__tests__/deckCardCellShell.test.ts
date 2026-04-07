import { describe, expect, it } from 'vitest';
import { buildDeckCardCellInnerHtml } from '../deck-builder/grid/deckCardCellShell.js';
import { DECK_CARD_BAN_BADGE_CLASS, DECK_CARD_THUMB_PLACEHOLDER_CLASS } from '../deck-builder/grid/deckGridDomSelectors.js';
import {
    DECK_CARD_THUMB_PLACEHOLDER_TEXT,
    deckCardBanBadgeVisibleLabel,
} from '../deck-builder/grid/deckCardGridCellCopy.js';

describe('buildDeckCardCellInnerHtml', () => {
    it('sans image : placeholder', () => {
        const html = buildDeckCardCellInnerHtml({ quantity: 2 });
        expect(html).toContain(
            `class="${DECK_CARD_THUMB_PLACEHOLDER_CLASS}">${DECK_CARD_THUMB_PLACEHOLDER_TEXT}<`,
        );
    });

    it('maxCopies < 3 : badge banlist', () => {
        const html = buildDeckCardCellInnerHtml({ quantity: 1, maxCopies: 1 });
        expect(html).toContain(`class="${DECK_CARD_BAN_BADGE_CLASS}"`);
        expect(html).toContain(deckCardBanBadgeVisibleLabel(1));
    });
});
