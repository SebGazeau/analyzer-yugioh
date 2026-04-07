import { describe, it, expect } from 'vitest';
import { DECK_DND_SUPPRESS_CLICK_MS } from '../deck-builder/deckConstants.js';
import { parseDeckCellDragPayload } from '../deck-builder/grid/deckDragDrop.js';

describe('deck DnD constantes', () => {
  it('fenêtre anti-clic fantôme après drag', () => {
    expect(DECK_DND_SUPPRESS_CLICK_MS).toBe(200);
  });
});

describe('parseDeckCellDragPayload', () => {
  it('accepte un JSON valide', () => {
    expect(parseDeckCellDragPayload(JSON.stringify({ section: 'main', index: 2 }))).toEqual({
      section: 'main',
      index: 2,
    });
  });

  it('troncature index entier', () => {
    expect(parseDeckCellDragPayload(JSON.stringify({ section: 'extra', index: 1.9 }))).toEqual({
      section: 'extra',
      index: 1,
    });
  });

  it('rejette JSON invalide, section inconnue, index négatif ou non fini', () => {
    expect(parseDeckCellDragPayload('')).toBeNull();
    expect(parseDeckCellDragPayload('{')).toBeNull();
    expect(parseDeckCellDragPayload(JSON.stringify({ section: 'banlist', index: 0 }))).toBeNull();
    expect(parseDeckCellDragPayload(JSON.stringify({ section: 'main', index: -1 }))).toBeNull();
    expect(parseDeckCellDragPayload(JSON.stringify({ section: 'main', index: NaN }))).toBeNull();
    expect(parseDeckCellDragPayload(JSON.stringify({ section: 1, index: 0 }))).toBeNull();
  });
});
