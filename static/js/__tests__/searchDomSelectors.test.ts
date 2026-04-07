import { describe, it, expect } from 'vitest';
import {
  SEARCH_HIGHLIGHT_CLASS,
  SEARCH_RESULT_INITIAL_CLASS,
  SEARCH_RESULT_INITIAL_KIND_CLASS,
  searchResultInitialCellClass,
} from '../searchDomSelectors.js';
import { CARD_TYPE_KIND_MONSTER } from '../utils/cardTypeKindConstants.js';

describe('searchDomSelectors', () => {
  it('searchResultInitialCellClass combine base + modificateur kind', () => {
    expect(searchResultInitialCellClass(CARD_TYPE_KIND_MONSTER)).toBe(
      `${SEARCH_RESULT_INITIAL_CLASS} ${SEARCH_RESULT_INITIAL_KIND_CLASS[CARD_TYPE_KIND_MONSTER]}`,
    );
  });

  it('SEARCH_HIGHLIGHT_CLASS aligné sur le CSS dashboard', () => {
    expect(SEARCH_HIGHLIGHT_CLASS).toBe('search-highlight');
  });
});
