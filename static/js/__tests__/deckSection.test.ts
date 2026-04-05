import { describe, it, expect } from 'vitest';
import { DECK_GRID_IDS, deckSectionForGridElementId } from '../deck-builder/deckConstants.js';
import { DECK_SECTIONS, isDeckSection, isDeckSectionMainSide } from '../deckSection.js';

describe('deckSection', () => {
  it('DECK_SECTIONS contient les trois zones dans l’ordre builder', () => {
    expect(DECK_SECTIONS).toEqual(['main', 'extra', 'side']);
  });

  it('isDeckSection accepte uniquement main / extra / side', () => {
    expect(isDeckSection('main')).toBe(true);
    expect(isDeckSection('extra')).toBe(true);
    expect(isDeckSection('side')).toBe(true);
    expect(isDeckSection('banlist')).toBe(false);
    expect(isDeckSection('')).toBe(false);
  });

  it('isDeckSectionMainSide exclut extra', () => {
    expect(isDeckSectionMainSide('main')).toBe(true);
    expect(isDeckSectionMainSide('side')).toBe(true);
    expect(isDeckSectionMainSide('extra')).toBe(false);
    expect(isDeckSectionMainSide('')).toBe(false);
  });
});

describe('deckSectionForGridElementId', () => {
  it('résout les IDs grille du builder', () => {
    expect(deckSectionForGridElementId('deck-main-grid', DECK_GRID_IDS)).toBe('main');
    expect(deckSectionForGridElementId('deck-extra-grid', DECK_GRID_IDS)).toBe('extra');
    expect(deckSectionForGridElementId('deck-side-grid', DECK_GRID_IDS)).toBe('side');
    expect(deckSectionForGridElementId('unknown', DECK_GRID_IDS)).toBeNull();
  });
});
