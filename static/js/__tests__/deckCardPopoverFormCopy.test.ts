import { describe, expect, it } from 'vitest';
import { DECK_DEFAULT_MAX_COPIES_PER_CARD } from '../deck-builder/deckConstants.js';
import {
    DECK_CARD_POPOVER_ENGINE_CHOICES,
    DECK_CARD_POPOVER_LABEL_CATEGORIES,
    DECK_CARD_POPOVER_LABEL_ENGINE,
    DECK_CARD_POPOVER_LABEL_QTY,
    DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL,
    DECK_CARD_POPOVER_SHELL_QTY_OPTION_COUNT,
} from '../deck-builder/card-edit-popover/deckCardPopoverFormCopy.js';

describe('deckCardPopoverFormCopy', () => {
    it('libellés formulaire non vides', () => {
        expect(DECK_CARD_POPOVER_LABEL_QTY.length).toBeGreaterThan(0);
        expect(DECK_CARD_POPOVER_LABEL_ENGINE.length).toBeGreaterThan(0);
        expect(DECK_CARD_POPOVER_LABEL_CATEGORIES.length).toBeGreaterThan(0);
        expect(DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL.length).toBeGreaterThan(0);
    });

    it('engines et plage qty cohérents avec le shell', () => {
        expect(DECK_CARD_POPOVER_ENGINE_CHOICES).toContain('Staple');
        expect(DECK_CARD_POPOVER_SHELL_QTY_OPTION_COUNT).toBe(DECK_DEFAULT_MAX_COPIES_PER_CARD);
    });
});
