import { describe, it, expect } from 'vitest';
import {
  DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS,
  DECK_SAVED_ITEM_DELETE_SVG_INNER_HTML,
  DECK_SAVED_ITEM_DUPLICATE_SVG_INNER_HTML,
} from '../deck-builder/deckSavedListDomSelectors.js';

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
});
