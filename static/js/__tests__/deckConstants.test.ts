import { describe, expect, it } from 'vitest';
import { DECK_DEFAULT_MAX_COPIES_PER_CARD, DECK_DEFAULT_ROW_QUANTITY } from '../deck-builder/deckConstants.js';

describe('deckConstants', () => {
  it('plafond TCG par défaut par nom de carte', () => {
    expect(DECK_DEFAULT_MAX_COPIES_PER_CARD).toBe(3);
  });

  it('quantité par défaut d’une ligne deck', () => {
    expect(DECK_DEFAULT_ROW_QUANTITY).toBe(1);
  });
});
