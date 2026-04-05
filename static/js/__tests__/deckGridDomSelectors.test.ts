import { describe, it, expect } from 'vitest';
import {
  DECK_CARD_CELL_CLASS,
  DECK_CARD_CELL_TYPE_KIND_CLASS,
  DECK_CARD_REMOVE_ONE_BTN_CLASS,
  DECK_CARD_REMOVE_ONE_ICON_SVG_ATTRS,
  DECK_CARD_REMOVE_ONE_PATH_HTML,
  DECK_CARD_THUMB_WRAPPER_CLASS,
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

  it('shell cellule : classes thumb / remove-one alignées CSS builder', () => {
    expect(DECK_CARD_THUMB_WRAPPER_CLASS).toBe('deck-card-thumb');
    expect(DECK_CARD_REMOVE_ONE_BTN_CLASS).toBe('deck-card-remove-one');
  });

  it('icône remove-one SVG viewBox', () => {
    expect(DECK_CARD_REMOVE_ONE_ICON_SVG_ATTRS).toBe('viewBox="0 0 24 24" fill="none"');
  });

  it('icône remove-one : path horizontal centralisé', () => {
    expect(DECK_CARD_REMOVE_ONE_PATH_HTML).toContain('d="M4 12h16"');
    expect(DECK_CARD_REMOVE_ONE_PATH_HTML).toContain('stroke-width="3.5"');
  });
});
