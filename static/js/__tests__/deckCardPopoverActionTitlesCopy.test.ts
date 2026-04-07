import { describe, expect, it } from 'vitest';
import { DECK_CARD_EDIT_DIALOG_TITLE } from '../deck-builder/card-edit-popover/deckCardEditDialogCopy.js';
import {
    DECK_CARD_POPOVER_ASSOCIATED_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE,
    DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_CLOSE_BTN_TITLE,
    DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_COVER_BTN_TITLE,
    DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL,
    DECK_CARD_POPOVER_DELETE_BTN_TITLE,
    DECK_CARD_POPOVER_HEADING_TEXT,
} from '../deck-builder/card-edit-popover/deckCardPopoverActionTitlesCopy.js';

describe('deckCardPopoverActionTitlesCopy', () => {
    it('heading aligné sur DECK_CARD_EDIT_DIALOG_TITLE', () => {
        expect(DECK_CARD_POPOVER_HEADING_TEXT).toBe(DECK_CARD_EDIT_DIALOG_TITLE);
    });

    it('titres / aria boutons non vides', () => {
        expect(DECK_CARD_POPOVER_CLOSE_BTN_TITLE.length).toBeGreaterThan(10);
        expect(DECK_CARD_POPOVER_CLOSE_BTN_ARIA_LABEL.length).toBeGreaterThan(5);
        expect(DECK_CARD_POPOVER_DELETE_BTN_TITLE).toContain('deck');
        expect(DECK_CARD_POPOVER_DELETE_BTN_ARIA_LABEL).toContain('deck');
        expect(DECK_CARD_POPOVER_COVER_BTN_TITLE).toContain('couverture');
        expect(DECK_CARD_POPOVER_COVER_BTN_ARIA_LABEL).toContain('couverture');
        expect(DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE.length).toBeGreaterThan(15);
        expect(DECK_CARD_POPOVER_ASSOCIATED_BTN_ARIA_LABEL.length).toBeGreaterThan(5);
        expect(DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE.toLowerCase()).toContain('associ');
    });
});
