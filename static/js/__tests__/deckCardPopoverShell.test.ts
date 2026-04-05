import { describe, it, expect } from 'vitest';
import { DECK_CARD_POPOVER_SHELL_HTML } from '../deck-builder/card-edit-popover/deckCardPopoverShell.js';
import {
  DECK_CARD_POPOVER_ENGINE_CLASS,
  DECK_CARD_POPOVER_INNER_CLASS,
  DECK_CARD_POPOVER_QTY_CLASS,
  DECK_CARD_POPOVER_ROW_CLASS,
  DECK_CARD_POPOVER_CATS_CLASS,
} from '../deck-builder/card-edit-popover/deckCardPopoverDomSelectors.js';

describe('deckCardPopoverShell', () => {
  it('structure Quantité / Engine / Catégories inchangée', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${DECK_CARD_POPOVER_INNER_CLASS}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${DECK_CARD_POPOVER_QTY_CLASS}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${DECK_CARD_POPOVER_ENGINE_CLASS}"`);
    const catsRow = `${DECK_CARD_POPOVER_ROW_CLASS} ${DECK_CARD_POPOVER_CATS_CLASS}`;
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${catsRow}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML.split(DECK_CARD_POPOVER_CATS_CLASS).length - 1).toBe(1);
  });
});
