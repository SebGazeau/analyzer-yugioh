import { describe, expect, it } from 'vitest';
import { DECK_CARD_EDIT_DIALOG_TITLE } from '../deck-builder/card-edit-popover/deckCardEditDialogCopy.js';

describe('deckCardEditDialogCopy', () => {
    it('titre dialogue édition carte', () => {
        expect(DECK_CARD_EDIT_DIALOG_TITLE).toBe('Modifier la carte');
    });
});
