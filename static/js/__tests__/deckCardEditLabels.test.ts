import { describe, expect, it } from 'vitest';
import { DECK_CARD_EDIT_DIALOG_TITLE } from '../utils/deckCardEditLabels.js';
import { DECK_CARD_POPOVER_HEADING_TEXT } from '../deck-builder/card-edit-popover/deckCardPopoverDomSelectors.js';

describe('deckCardEditLabels', () => {
  it('titre dialogue partagé avec le popover grille', () => {
    expect(DECK_CARD_EDIT_DIALOG_TITLE).toBe('Modifier la carte');
    expect(DECK_CARD_POPOVER_HEADING_TEXT).toBe(DECK_CARD_EDIT_DIALOG_TITLE);
  });
});
