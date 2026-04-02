import { describe, it, expect } from 'vitest';
import type { Card } from '../api.js';
import type { DeckRow } from '../deck.js';
import { tryAddCardToDeckSection } from '../deck-builder/tryAddCardToDeckSection.js';

const monster: Card = { id: 100, name: 'Test Monster', type: 'Effect Monster' };

describe('tryAddCardToDeckSection', () => {
  it('crée une nouvelle ligne si la section est vide', () => {
    const arr: DeckRow[] = [];
    const r = tryAddCardToDeckSection(monster, arr, arr);
    expect(r).toEqual({ ok: true, mode: 'newRow' });
    expect(arr).toHaveLength(1);
    expect(arr[0].quantity).toBe(1);
    expect(arr[0].cardId).toBe(100);
  });

  it('incrémente la ligne existante (même id)', () => {
    const arr: DeckRow[] = [
      {
        name: 'Test Monster',
        type: 'Effect Monster',
        quantity: 1,
        engine: '',
        categories: [],
        cardId: 100,
      },
    ];
    const r = tryAddCardToDeckSection(monster, arr, arr);
    expect(r).toEqual({ ok: true, mode: 'increment' });
    expect(arr[0].quantity).toBe(2);
  });

  it('refuse si quantity >= maxCopies', () => {
    const arr: DeckRow[] = [
      {
        name: 'Test Monster',
        type: 'Effect Monster',
        quantity: 3,
        engine: '',
        categories: [],
        cardId: 100,
        maxCopies: 3,
      },
    ];
    const r = tryAddCardToDeckSection(monster, arr, arr);
    expect(r).toEqual({ ok: false });
    expect(arr[0].quantity).toBe(3);
  });

  it('refuse une carte Forbidden (banlist)', () => {
    const banned: Card = { ...monster, ban_tcg: 'Forbidden' };
    const arr: DeckRow[] = [];
    const r = tryAddCardToDeckSection(banned, arr, arr);
    expect(r).toEqual({ ok: false });
    expect(arr).toHaveLength(0);
  });
});
