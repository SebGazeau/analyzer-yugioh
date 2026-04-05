// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
  cleanCardNameFromCell,
  cleanCardTable,
  exportDeckToFile,
  getDeckState,
  isExtraDeckCard,
  toDeckEntryPayload,
} from '../deck.js';
import {
  addCard,
  createEmptyDeckState,
  exportDeckToYDK,
  getDeckSize,
  importDeckFromYDK,
  isLegal,
  removeCard,
  type DeckEntry,
  type DeckState,
} from '../deck-state.js';

describe('deck.ts', () => {
  it('isExtraDeckCard identifies Fusion, Synchro, XYZ, Link', () => {
    expect(isExtraDeckCard({ name: 'x', type: 'Fusion Monster' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'Synchro Monster' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'XYZ Monster' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'Link Monster' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'Effect Monster' })).toBe(false);
    expect(isExtraDeckCard({ name: 'x', type: 'Spell Card' })).toBe(false);
    // Backend envoie type: "Monster" ; frame_type permet de distinguer
    expect(isExtraDeckCard({ name: 'x', type: 'Monster', frame_type: 'synchro' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'Monster', frame_type: 'fusion' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'Monster', frame_type: 'xyz' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'Monster', frame_type: 'link' })).toBe(true);
    expect(isExtraDeckCard({ name: 'x', type: 'Monster', frame_type: 'effect' })).toBe(false);
  });

  it('exportDeckToFile crée un blob et déclenche téléchargement (grille vide)', () => {
    document.body.innerHTML =
      '<div id="deck-main-grid"></div><div id="deck-extra-grid"></div><div id="deck-side-grid"></div>' +
      '<div id="category-summary-body"></div>';
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickFn = vi.fn();
    const createElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const el = createElement(tag);
      if (tag === 'a') el.click = clickFn;
      return el;
    }) as typeof document.createElement;
    exportDeckToFile();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(clickFn).toHaveBeenCalled();
  });

  it('cleanCardTable vide le state et les grilles cartes', () => {
    document.body.innerHTML =
      '<div id="category-summary-body"></div>' +
      '<div id="deck-main-grid" class="deck-cards-grid"></div>' +
      '<div id="deck-extra-grid" class="deck-cards-grid"></div>' +
      '<div id="deck-side-grid" class="deck-cards-grid"></div>';
    cleanCardTable();
    const state = getDeckState();
    expect(state.main.length).toBe(0);
    expect(state.extra.length).toBe(0);
    expect(state.side.length).toBe(0);
    expect(document.querySelectorAll('#deck-main-grid .deck-card-cell').length).toBe(0);
  });

  it('cleanCardNameFromCell removes placeholder prefix', () => {
    expect(cleanCardNameFromCell('— Dark Magician')).toBe('Dark Magician');
    expect(cleanCardNameFromCell('Blue-Eyes White Dragon')).toBe('Blue-Eyes White Dragon');
  });

  it('toDeckEntryPayload omits empty engine and categories', () => {
    expect(
      toDeckEntryPayload({
        name: 'Dark Magician',
        quantity: 2,
        engine: '   ',
        categories: [],
      }),
    ).toEqual({
      name: 'Dark Magician',
      quantity: 2,
    });
  });

  it('toDeckEntryPayload keeps engine and categories when present', () => {
    expect(
      toDeckEntryPayload({
        name: 'Ash Blossom & Joyous Spring',
        quantity: 3,
        engine: 'Staple',
        categories: ['Hand Trap', 'Interruption'],
      }),
    ).toEqual({
      name: 'Ash Blossom & Joyous Spring',
      quantity: 3,
      engine: 'Staple',
      categories: ['Hand Trap', 'Interruption'],
    });
  });

  it('toDeckEntryPayload inclut id (passcode) quand cardId est défini', () => {
    expect(
      toDeckEntryPayload({
        name: 'Fallen of Albaz',
        quantity: 2,
        engine: '',
        categories: [],
        cardId: 684_684_59,
      }),
    ).toEqual({
      name: 'Fallen of Albaz',
      quantity: 2,
      id: 68468459,
    });
  });
});

describe('deck-state.ts — logique pure', () => {
  const emptyState: DeckState = createEmptyDeckState();

  function testDeck(main: DeckEntry[], extra: DeckEntry[] = [], side: DeckEntry[] = []): DeckState {
    return { main, extra, side };
  }

  it('createEmptyDeckState isole les tableaux entre appels', () => {
    const a = createEmptyDeckState();
    const b = createEmptyDeckState();
    a.main.push({ id: 1, name: 'x', quantity: 1 });
    expect(b.main).toHaveLength(0);
    expect(getDeckSize(a)).toBe(1);
  });

  it('addCard(deck, card) augmente le count de 1', () => {
    const card = { id: 1, name: 'Test' };
    const { state, ok } = addCard(emptyState, card, 'main');
    expect(ok).toBe(true);
    expect(getDeckSize(state)).toBe(1);
    expect(state.main).toHaveLength(1);
    expect(state.main[0].quantity).toBe(1);
  });

  it('addCard quand count = 3 rejette (limite 3 exemplaires)', () => {
    let state: DeckState = testDeck([{ id: 1, name: 'X', quantity: 3 }]);
    const { ok } = addCard(state, { id: 1, name: 'X' }, 'main');
    expect(ok).toBe(false);
    expect(getDeckSize(state)).toBe(3);
  });

  it('addCard carte extra deck va dans extra, pas main', () => {
    const card = { id: 2, name: 'Fusion', type: 'Fusion Monster' };
    const { state, ok } = addCard(emptyState, card);
    expect(ok).toBe(true);
    expect(state.main).toHaveLength(0);
    expect(state.extra).toHaveLength(1);
    expect(state.extra[0].id).toBe(2);
  });

  it('removeCard(deck, cardId) diminue le count', () => {
    const state: DeckState = testDeck([{ id: 10, name: 'A', quantity: 2 }]);
    const next = removeCard(state, 10, 'main');
    expect(getDeckSize(next)).toBe(1);
    expect(next.main[0].quantity).toBe(1);
  });

  it('removeCard dernière copie retire la carte du deck', () => {
    const state: DeckState = testDeck([{ id: 10, name: 'A', quantity: 1 }]);
    const next = removeCard(state, 10, 'main');
    expect(next.main).toHaveLength(0);
    expect(getDeckSize(next)).toBe(0);
  });

  it('getDeckSize(deck) = somme main + extra + side', () => {
    const state: DeckState = testDeck(
      [{ id: 1, name: 'A', quantity: 40 }],
      [{ id: 2, name: 'B', quantity: 15 }],
      [{ id: 3, name: 'C', quantity: 15 }],
    );
    expect(getDeckSize(state)).toBe(70);
  });

  it('isLegal(deck) false quand main < 40', () => {
    const state: DeckState = testDeck([{ id: 1, name: 'A', quantity: 39 }]);
    expect(isLegal(state)).toBe(false);
  });

  it('isLegal(deck) false quand extra > 15', () => {
    const state: DeckState = testDeck([{ id: 1, name: 'A', quantity: 40 }], [
      { id: 2, name: 'B', quantity: 16 },
    ]);
    expect(isLegal(state)).toBe(false);
  });

  it('isLegal(deck) true pour 40 main, 15 extra, 15 side', () => {
    const state: DeckState = testDeck(
      [{ id: 1, name: 'A', quantity: 40 }],
      [{ id: 2, name: 'B', quantity: 15 }],
      [{ id: 3, name: 'C', quantity: 15 }],
    );
    expect(isLegal(state)).toBe(true);
  });

  it('exportDeckToYDK produit le format attendu', () => {
    const state: DeckState = testDeck(
      [{ id: 46986414, name: 'Blue-Eyes', quantity: 2 }],
      [{ id: 89631139, name: 'DM', quantity: 1 }],
    );
    const ydk = exportDeckToYDK(state);
    expect(ydk).toContain('#main');
    expect(ydk).toContain('#extra');
    expect(ydk).toContain('!side');
    expect(ydk).toContain('46986414');
    expect(ydk).toContain('89631139');
    const mainBlock = ydk.split('#main')[1].split('#extra')[0].trim();
    const mainIds = mainBlock.split(/\r?\n/).filter(Boolean);
    expect(mainIds.filter((id) => id === '46986414')).toHaveLength(2);
  });

  it('importDeckFromYDK parse les card IDs correctement', () => {
    const ydk = '#main\n46986414\n46986414\n89631139\n#extra\n#side\n!side\n12345\n';
    const { state } = importDeckFromYDK(ydk);
    expect(state.main.some((e) => e.id === 46986414 && e.quantity === 2)).toBe(true);
    expect(state.main.some((e) => e.id === 89631139 && e.quantity === 1)).toBe(true);
    expect(state.side.some((e) => e.id === 12345)).toBe(true);
  });

  it('importDeckFromYDK avec chaîne malformée ne plante pas, retourne state partiel', () => {
    const { state } = importDeckFromYDK('garbage\n#main\n999\n');
    expect(state.main.some((e) => e.id === 999)).toBe(true);
  });

  it('addCard rejette quand la zone main est pleine (60)', () => {
    const state: DeckState = testDeck([{ id: 1, name: 'Filler', quantity: 60 }]);
    const { ok } = addCard(state, { id: 2, name: 'New' }, 'main');
    expect(ok).toBe(false);
  });

  it('addCard rejette quand la zone extra est pleine (15)', () => {
    const state: DeckState = testDeck([{ id: 1, name: 'F', quantity: 40 }], [
      { id: 2, name: 'E', quantity: 15 },
    ]);
    const { ok } = addCard(state, { id: 3, name: 'X', type: 'Fusion Monster' });
    expect(ok).toBe(false);
  });

  it('addCard côté side remplit la side', () => {
    const { state, ok } = addCard(emptyState, { id: 10, name: 'Side Card' }, 'side');
    expect(ok).toBe(true);
    expect(state.side).toHaveLength(1);
    expect(state.side[0].id).toBe(10);
  });

  it('isLegal false quand main > 60', () => {
    const state: DeckState = testDeck([{ id: 1, name: 'X', quantity: 61 }]);
    expect(isLegal(state)).toBe(false);
  });

  it('isLegal false quand side > 15', () => {
    const state: DeckState = testDeck([{ id: 1, name: 'X', quantity: 40 }], [], [
      { id: 2, name: 'S', quantity: 16 },
    ]);
    expect(isLegal(state)).toBe(false);
  });

  it('importDeckFromYDK parse #main après #extra (switch section)', () => {
    const ydk = '#extra\n#main\n111\n222\n!side\n333\n';
    const { state } = importDeckFromYDK(ydk);
    expect(state.main.some((e) => e.id === 111)).toBe(true);
    expect(state.main.some((e) => e.id === 222)).toBe(true);
    expect(state.side.some((e) => e.id === 333)).toBe(true);
  });
}); 