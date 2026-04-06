import { describe, expect, it } from 'vitest';
import { DECK_DEFAULT_MAX_COPIES_PER_CARD } from '../deck-builder/deckConstants.js';

describe('deckConstants', () => {
  it('plafond TCG par défaut par nom de carte', () => {
    expect(DECK_DEFAULT_MAX_COPIES_PER_CARD).toBe(3);
  });
});
