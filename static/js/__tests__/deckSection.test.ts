import { describe, it, expect } from 'vitest';
import { DECK_GRID_IDS, deckSectionForGridElementId } from '../deck-builder/deckConstants.js';
import {
  DECK_SECTIONS,
  emptyArraysByDeckSection,
  hasTruthyDeckSectionData,
  isDeckSection,
  isDeckSectionMainSide,
  mapDeckSections,
} from '../deckSection.js';

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

  it('mapDeckSections produit les trois clés dans l’ordre canonique', () => {
    expect(mapDeckSections((s) => s.length)).toEqual({ main: 4, extra: 5, side: 4 });
  });

  it('emptyArraysByDeckSection donne trois tableaux vides distincts', () => {
    const e = emptyArraysByDeckSection<number>();
    expect(e.main).toEqual([]);
    e.main.push(1);
    expect(e.extra).toEqual([]);
    expect(e.side).toEqual([]);
  });

  it('hasTruthyDeckSectionData détecte au moins une zone truthy', () => {
    expect(hasTruthyDeckSectionData({})).toBe(false);
    expect(hasTruthyDeckSectionData({ foo: 1 })).toBe(false);
    expect(hasTruthyDeckSectionData({ main: [] })).toBe(true);
    expect(hasTruthyDeckSectionData({ extra: [1], main: null })).toBe(true);
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
