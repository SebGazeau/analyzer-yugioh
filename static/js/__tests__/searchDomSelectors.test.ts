import { describe, it, expect } from 'vitest';
import {
  SEARCH_FETCH_ERROR_MESSAGE,
  SEARCH_HIGHLIGHT_CLASS,
  SEARCH_RESULT_INITIAL_CLASS,
  SEARCH_RESULT_INITIAL_KIND_CLASS,
  searchResultInitialCellClass,
} from '../searchDomSelectors.js';

describe('searchDomSelectors', () => {
  it('searchResultInitialCellClass combine base + modificateur kind', () => {
    expect(searchResultInitialCellClass('monster')).toBe(
      `${SEARCH_RESULT_INITIAL_CLASS} ${SEARCH_RESULT_INITIAL_KIND_CLASS.monster}`,
    );
  });

  it('SEARCH_HIGHLIGHT_CLASS aligné sur le CSS dashboard', () => {
    expect(SEARCH_HIGHLIGHT_CLASS).toBe('search-highlight');
  });

  it('message erreur fetch recherche stable', () => {
    expect(SEARCH_FETCH_ERROR_MESSAGE).toContain('Erreur');
    expect(SEARCH_FETCH_ERROR_MESSAGE.length).toBeGreaterThan(15);
  });
});
