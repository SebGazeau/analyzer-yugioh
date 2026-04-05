import { describe, it, expect } from 'vitest';
import {
  DECK_CARD_CELL_CLASS,
  DECK_CARD_CELL_TYPE_KIND_CLASS,
  deckCardCellWrapperClassName,
} from '../deck-builder/grid/deckGridDomSelectors.js';

describe('deckGridDomSelectors', () => {
  it('deckCardCellWrapperClassName combine base + modificateur type', () => {
    expect(deckCardCellWrapperClassName('monster')).toBe(
      `${DECK_CARD_CELL_CLASS} ${DECK_CARD_CELL_TYPE_KIND_CLASS.monster}`,
    );
    expect(deckCardCellWrapperClassName('spell')).toBe(
      `${DECK_CARD_CELL_CLASS} ${DECK_CARD_CELL_TYPE_KIND_CLASS.spell}`,
    );
    expect(deckCardCellWrapperClassName('trap')).toBe(
      `${DECK_CARD_CELL_CLASS} ${DECK_CARD_CELL_TYPE_KIND_CLASS.trap}`,
    );
  });

  it('modificateurs correspondent aux classes BEM attendues', () => {
    expect(DECK_CARD_CELL_TYPE_KIND_CLASS.monster).toBe('deck-card-cell--monster');
    expect(DECK_CARD_CELL_TYPE_KIND_CLASS.spell).toBe('deck-card-cell--spell');
    expect(DECK_CARD_CELL_TYPE_KIND_CLASS.trap).toBe('deck-card-cell--trap');
  });
});
