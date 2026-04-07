import { describe, it, expect } from 'vitest';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_DEBOUNCE_TEST_OVERRUN_MS,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_PREVIEW_DEBOUNCE_MS,
} from '../searchConstants.js';

describe('searchConstants', () => {
  it('valeurs alignées sur le comportement historique (debounce + seuil)', () => {
    expect(SEARCH_MIN_QUERY_LENGTH).toBe(4);
    expect(SEARCH_PREVIEW_DEBOUNCE_MS).toBe(200);
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
    expect(SEARCH_DEBOUNCE_MS + SEARCH_DEBOUNCE_TEST_OVERRUN_MS).toBe(350);
  });
});
