import { describe, it, expect } from 'vitest';
import { DECK_CARD_POPOVER_SHELL_HTML } from '../deck-builder/card-edit-popover/deckCardPopoverShell.js';
import {
  DECK_CARD_POPOVER_CATS_CLASS,
  DECK_CARD_POPOVER_ENGINE_CLASS,
  DECK_CARD_POPOVER_ICON_SVG_ATTRS,
  DECK_CARD_POPOVER_INNER_CLASS,
  DECK_CARD_POPOVER_QTY_CLASS,
  DECK_CARD_POPOVER_ROW_CLASS,
  DECK_CARD_POPOVER_CLOSE_BTN_TITLE,
  DECK_CARD_POPOVER_HEADING_TEXT,
  DECK_CARD_POPOVER_SVG_COVER_INNER_HTML,
  DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML,
  DECK_CARD_POPOVER_SVG_PATH_CLOSE_D,
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

  it('trois icônes partagent les attributs SVG stroke communs', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML.split(DECK_CARD_POPOVER_ICON_SVG_ATTRS).length - 1).toBe(3);
  });

  it('chemins SVG du shell alignés sur les exports domSelectors', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`d="${DECK_CARD_POPOVER_SVG_PATH_CLOSE_D}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_SVG_COVER_INNER_HTML);
  });

  it('titres / aria-label boutons action exportés dans domSelectors', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_CLOSE_BTN_TITLE);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_HEADING_TEXT);
  });
});
