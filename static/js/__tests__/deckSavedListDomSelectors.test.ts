import { describe, it, expect } from 'vitest';
import {
  DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS,
  DECK_SAVED_ITEM_DELETE_BTN_TITLE,
  DECK_SAVED_ITEM_DELETE_SVG_INNER_HTML,
  DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE,
  deckSavedListItemLoadTitle,
  DECK_SAVED_ITEM_DUPLICATE_SVG_INNER_HTML,
  htmlDeckSavedItemDeleteActionSvg,
  htmlDeckSavedItemDuplicateActionSvg,
} from '../deck-builder/deckSavedListDomSelectors.js';
import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from '../utils/textPlaceholders.js';

describe('deckSavedListDomSelectors', () => {
  it('SVG actions liste : racine 18×24 viewBox', () => {
    expect(DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS).toContain('viewBox="0 0 24 24"');
  });

  it('icônes dupliquer / supprimer : fragments internes stables', () => {
    expect(DECK_SAVED_ITEM_DELETE_SVG_INNER_HTML).toContain('M3 6h18');
    expect(DECK_SAVED_ITEM_DUPLICATE_SVG_INNER_HTML).toContain('<rect x="9"');
    expect(DECK_SAVED_ITEM_DUPLICATE_SVG_INNER_HTML).toContain('M5 15H4');
  });

  it('SVG actions complets incluent inner + aria-hidden', () => {
    expect(htmlDeckSavedItemDeleteActionSvg()).toContain(DECK_SAVED_ITEM_DELETE_SVG_INNER_HTML);
    expect(htmlDeckSavedItemDuplicateActionSvg()).toContain(DECK_SAVED_ITEM_DUPLICATE_SVG_INNER_HTML);
    expect(htmlDeckSavedItemDeleteActionSvg()).toContain('aria-hidden="true"');
  });

  it('titres boutons dupliquer / supprimer liste Mes decks', () => {
    expect(DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE).toContain('Dupliquer');
    expect(DECK_SAVED_ITEM_DELETE_BTN_TITLE).toContain('Supprimer');
  });

  it('title ligne charger deck échappe le nom', () => {
    expect(deckSavedListItemLoadTitle('Test')).toContain('Test');
    expect(deckSavedListItemLoadTitle('Test')).toContain(TEXT_GUILLEMET_OPEN);
    expect(deckSavedListItemLoadTitle('Test')).toContain(TEXT_GUILLEMET_CLOSE);
    expect(deckSavedListItemLoadTitle('<')).not.toContain('<');
  });
});
