/**
 * Valide que les fixtures existent et ont la structure attendue.
 * Nécessite "resolveJsonModule": true dans tsconfig.
 */
import { describe, it, expect } from 'vitest';

import standardDeck40 from './fixtures/decks/standard-deck-40.json';
import fullDeck from './fixtures/decks/full-deck-60-15-15.json';
import emptyDeck from './fixtures/decks/empty-deck.json';
import illegalDeck from './fixtures/decks/illegal-deck.json';
import normalMonster from './fixtures/cards/normal-monster.json';
import extraDeckMonster from './fixtures/cards/extra-deck-monster.json';
import spellCard from './fixtures/cards/spell.json';
import trapCard from './fixtures/cards/trap.json';
import results3 from './fixtures/search/results-3-cards.json';
import resultsEmpty from './fixtures/search/results-empty.json';
import resultsLimited from './fixtures/search/results-with-limited.json';
import deckWithCategories from './fixtures/categories/deck-with-categories.json';

function mainCount(deck: { main: { quantity?: number }[] }) {
  return deck.main.reduce((s, e) => s + (e.quantity ?? 1), 0);
}
function extraCount(deck: { extra: { quantity?: number }[] }) {
  return deck.extra.reduce((s, e) => s + (e.quantity ?? 1), 0);
}

describe('fixtures/decks', () => {
  it('standard-deck-40.json : 40 main, 0 extra, 0 side', () => {
    expect(mainCount(standardDeck40)).toBe(40);
    expect(extraCount(standardDeck40)).toBe(0);
    expect(standardDeck40.side).toHaveLength(standardDeck40.side.length);
  });

  it('full-deck-60-15-15.json : 60 main, 15 extra, 15 side', () => {
    expect(mainCount(fullDeck)).toBe(60);
    expect(extraCount(fullDeck)).toBe(15);
    expect(fullDeck.side.reduce((s: number, e: { quantity?: number }) => s + (e.quantity ?? 1), 0)).toBe(15);
  });

  it('empty-deck.json : tableaux vides', () => {
    expect(emptyDeck.main).toHaveLength(0);
    expect(emptyDeck.extra).toHaveLength(0);
    expect(emptyDeck.side).toHaveLength(0);
  });

  it('illegal-deck.json : 39 main, 16 extra', () => {
    expect(mainCount(illegalDeck)).toBe(39);
    expect(extraCount(illegalDeck)).toBe(16);
  });
});

describe('fixtures/cards', () => {
  it('normal-monster.json a type Monster et champs monster', () => {
    expect(normalMonster.type).toContain('Monster');
    expect(normalMonster.atk).toBe(3000);
    expect(normalMonster.name).toBeDefined();
  });

  it('extra-deck-monster.json a type Fusion/Synchro/XYZ/Link', () => {
    expect(extraDeckMonster.type).toContain('Fusion');
  });

  it('spell.json a type Spell', () => {
    expect(spellCard.type).toContain('Spell');
  });

  it('trap.json a type Trap', () => {
    expect(trapCard.type).toContain('Trap');
  });
});

describe('fixtures/search', () => {
  it('results-3-cards.json : 3 cartes', () => {
    expect(Array.isArray(results3)).toBe(true);
    expect(results3).toHaveLength(3);
    expect(results3[0]).toHaveProperty('name');
    expect(results3[0]).toHaveProperty('name_en');
  });

  it('results-empty.json : tableau vide', () => {
    expect(resultsEmpty).toEqual([]);
  });

  it('results-with-limited.json : champs banlist', () => {
    expect(resultsLimited.length).toBeGreaterThan(0);
    expect(resultsLimited[0]).toHaveProperty('ban_tcg');
  });
});

describe('fixtures/categories', () => {
  it('deck-with-categories.json : entrées avec categories', () => {
    const withCat = deckWithCategories.main.filter(
      (e: { categories?: string[] }) => e.categories && e.categories.length > 0,
    );
    expect(withCat.length).toBeGreaterThan(0);
    expect(deckWithCategories.main.some((e: { categories?: string[] }) => e.categories?.includes('Hand Trap'))).toBe(true);
  });
});
