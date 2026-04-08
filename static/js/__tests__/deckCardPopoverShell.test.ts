import { describe, it, expect } from 'vitest';
import {
  DECK_CARD_POPOVER_LABEL_CATEGORIES,
  DECK_CARD_POPOVER_LABEL_ENGINE,
  DECK_CARD_POPOVER_LABEL_QTY,
  DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL,
} from '../deck-builder/card-edit-popover/deckCardPopoverFormCopy.js';
import { ARIA_LABEL_ATTR } from '../utils/ariaAttrs.js';
import { DECK_CARD_POPOVER_SHELL_HTML } from '../deck-builder/card-edit-popover/deckCardPopoverShell.js';
import {
  DATA_DECK_POPOVER_ART_BANNER,
  DATA_DECK_POPOVER_DESC,
  DECK_CARD_POPOVER_ASSOCIATED_CLASS,
  DECK_CARD_POPOVER_CATEGORIES_LABEL_ID,
  DECK_CARD_POPOVER_CATS_CLASS,
  DECK_CARD_POPOVER_COL_DECK_CLASS,
  DECK_CARD_POPOVER_COL_TEXT_CLASS,
  DECK_CARD_POPOVER_ENGINE_CLASS,
  DECK_CARD_POPOVER_ENGINE_INPUT_ID,
  DECK_CARD_POPOVER_FIELD_LABEL_CLASS,
  DECK_CARD_POPOVER_FIELD_LABEL_STACK_CLASS,
  DECK_CARD_POPOVER_INNER_CLASS,
  DECK_CARD_POPOVER_MAIN_CLASS,
  DECK_CARD_POPOVER_QTY_CLASS,
  DECK_CARD_POPOVER_QTY_INPUT_ID,
  DECK_CARD_POPOVER_ROW_CLASS,
  DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE,
  DECK_CARD_POPOVER_CLOSE_BTN_TITLE,
  DECK_CARD_POPOVER_HEADING_TEXT,
} from '../deck-builder/card-edit-popover/deckCardPopoverDomSelectors.js';
import {
  DECK_CARD_POPOVER_ICON_SVG_ATTRS,
  DECK_CARD_POPOVER_SVG_ASSOCIATED_PATHS_HTML,
  DECK_CARD_POPOVER_SVG_COVER_INNER_HTML,
  DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML,
  DECK_CARD_POPOVER_SVG_PATH_CLOSE_D,
} from '../deck-builder/card-edit-popover/deckCardPopoverIconsHtml.js';

describe('deckCardPopoverShell', () => {
  it('bannière art puis grille : texte (gauche), deck (droite), actions en dessous', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DATA_DECK_POPOVER_ART_BANNER);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain('deck-card-popover-banner-mount');
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_MAIN_CLASS);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_COL_TEXT_CLASS);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_COL_DECK_CLASS);
    const idxDesc = DECK_CARD_POPOVER_SHELL_HTML.indexOf(DATA_DECK_POPOVER_DESC);
    const idxDeckHeading = DECK_CARD_POPOVER_SHELL_HTML.indexOf(DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL);
    expect(idxDesc).toBeGreaterThan(-1);
    expect(idxDeckHeading).toBeGreaterThan(-1);
    expect(idxDesc).toBeLessThan(idxDeckHeading);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_SETTINGS_SECTION_LABEL);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(
      `${ARIA_LABEL_ATTR}="${DECK_CARD_POPOVER_LABEL_QTY}"`,
    );
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(
      `${ARIA_LABEL_ATTR}="${DECK_CARD_POPOVER_LABEL_ENGINE}"`,
    );
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${DECK_CARD_POPOVER_FIELD_LABEL_CLASS}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`for="${DECK_CARD_POPOVER_QTY_INPUT_ID}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`for="${DECK_CARD_POPOVER_ENGINE_INPUT_ID}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`id="${DECK_CARD_POPOVER_QTY_INPUT_ID}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`id="${DECK_CARD_POPOVER_ENGINE_INPUT_ID}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_LABEL_CATEGORIES);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`id="${DECK_CARD_POPOVER_CATEGORIES_LABEL_ID}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_FIELD_LABEL_STACK_CLASS);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${DECK_CARD_POPOVER_INNER_CLASS}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${DECK_CARD_POPOVER_QTY_CLASS}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${DECK_CARD_POPOVER_ENGINE_CLASS}"`);
    const catsRow = `${DECK_CARD_POPOVER_ROW_CLASS} ${DECK_CARD_POPOVER_CATS_CLASS}`;
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`class="${catsRow}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML.split(DECK_CARD_POPOVER_CATS_CLASS).length - 1).toBe(1);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DATA_DECK_POPOVER_DESC);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain('deck-card-popover-card-desc');
  });

  it('quatre icônes partagent les attributs SVG stroke communs', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML.split(DECK_CARD_POPOVER_ICON_SVG_ATTRS).length - 1).toBe(4);
  });

  it('chemins SVG du shell alignés sur les exports domSelectors', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(`d="${DECK_CARD_POPOVER_SVG_PATH_CLOSE_D}"`);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_SVG_COVER_INNER_HTML);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_SVG_ASSOCIATED_PATHS_HTML);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_ASSOCIATED_CLASS);
  });

  it('titres / aria-label boutons action exportés dans domSelectors', () => {
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_CLOSE_BTN_TITLE);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_ASSOCIATED_BTN_TITLE);
    expect(DECK_CARD_POPOVER_SHELL_HTML).toContain(DECK_CARD_POPOVER_HEADING_TEXT);
  });
});
