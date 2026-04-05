import { describe, it, expect } from 'vitest';
import { DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS } from '../deck-builder/deckSavedListDomSelectors.js';

describe('deckSavedListDomSelectors', () => {
  it('SVG actions liste : racine 18×24 viewBox', () => {
    expect(DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(DECK_SAVED_ITEM_ACTION_SVG_ROOT_ATTRS).toContain('viewBox="0 0 24 24"');
  });
});
