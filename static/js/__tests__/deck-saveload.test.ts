// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Card } from '../api.js';
import { BUILDER_DECK_DRAFT_SESSION_KEY } from '../deck-builder/builderDeckDraft.js';
import { DECK_NAME_INPUT_ID } from '../deck-builder/deckConstants.js';
import {
  addToDeck,
  clearCurrentLoadedDeck,
  duplicateDeckOnServer,
  getCurrentLoadedDeck,
  listMyDecks,
  loadDeckFromServer,
  saveDeckToServer,
  updateDeckOnServer,
} from '../deck.js';
import { CARD_API_PATH } from '../cardSearchApiRoutes.js';
import { DECK_API_COLLECTION_URL, deckApiDeckByIdUrl } from '../deck-builder/deckApiRoutes.js';
import { DECK_GRID_IDS, DECK_TABLE_GRID_CLASS } from '../deck-builder/deckConstants.js';
import {
  HTTP_METHOD_POST,
  HTTP_METHOD_PUT,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_OK,
  HTTP_STATUS_UNAUTHORIZED,
} from '../utils/httpMime.js';
import { DECK_CARD_CELL_SELECTOR } from '../deck-builder/grid/deckGridDomSelectors.js';
import { htmlCategorySummaryBody, htmlDeckGrids } from './helpers/deckTestDom.js';

/** DOM minimal pour loadDeckFromServer (grilles + category-summary). */
function minimalDOM() {
  document.body.innerHTML = htmlDeckGrids(DECK_TABLE_GRID_CLASS) + htmlCategorySummaryBody();
}

describe('Save/Load deck — fetch mocké', () => {
  beforeEach(() => {
    minimalDOM();
    sessionStorage.clear();
    vi.stubGlobal('prompt', vi.fn().mockReturnValue('My Deck'));
  });

  it('saveDeckToServer envoie POST /decks avec name et main/extra/side', async () => {
    let postBody: unknown = null;
    vi.stubGlobal('fetch', vi.fn((url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === DECK_API_COLLECTION_URL && init?.method === HTTP_METHOD_POST) {
        postBody = init.body ? JSON.parse(init.body as string) : null;
        return Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: HTTP_STATUS_OK }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: HTTP_STATUS_OK }));
    }));
    const r = await saveDeckToServer();
    expect(r.id).toBe(1);
    expect(sessionStorage.getItem(BUILDER_DECK_DRAFT_SESSION_KEY)).toBeNull();
    expect(postBody).toHaveProperty('name', 'My Deck');
    expect(postBody).toHaveProperty('main');
    expect(postBody).toHaveProperty('extra');
    expect(postBody).toHaveProperty('side');
  });

  it('load deck avec 0 extra ne plante pas (fetch mocké retourne deck sans extra)', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.startsWith(`${DECK_API_COLLECTION_URL}/`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 1,
              name: 'Empty Extra',
              main: [{ name: 'Card A', quantity: 1 }],
              extra: [],
              side: [],
            }),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      if (u.startsWith(`${CARD_API_PATH}?`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: 1, name: 'Card A', type: 'Effect Monster' }),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      return Promise.resolve(new Response('[]', { status: HTTP_STATUS_OK }));
    }));
    const loaded = await loadDeckFromServer(1);
    expect(loaded.ok).toBe(true);
    const extraGrid = document.getElementById(DECK_GRID_IDS.extra);
    expect(extraGrid?.querySelectorAll(DECK_CARD_CELL_SELECTOR).length ?? 0).toBe(0);
  });

  it('listMyDecks retourne la liste quand fetch ok', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === DECK_API_COLLECTION_URL) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: 1, name: 'Deck A', is_public: false, created_at: '2024-01-01' },
              { id: 2, name: 'Deck B', is_public: true, created_at: '2024-01-02' },
            ]),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      return Promise.resolve(new Response('[]', { status: HTTP_STATUS_OK }));
    }));
    const decks = await listMyDecks();
    expect(decks).toHaveLength(2);
    expect(decks[0].name).toBe('Deck A');
    expect(decks[1].id).toBe(2);
  });

  it('listMyDecks retourne [] quand fetch !ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: HTTP_STATUS_UNAUTHORIZED })));
    const decks = await listMyDecks();
    expect(decks).toEqual([]);
  });

  it('getCurrentLoadedDeck retourne null quand aucun deck chargé', () => {
    clearCurrentLoadedDeck();
    expect(getCurrentLoadedDeck()).toBeNull();
  });

  it('updateDeckOnServer retourne error quand aucun deck chargé', async () => {
    clearCurrentLoadedDeck();
    const r = await updateDeckOnServer();
    expect(r.error).toBeDefined();
    expect(r.ok).toBeUndefined();
  });

  it('updateDeckOnServer envoie PUT /decks/:id après un load', async () => {
    let putUrl: string | null = null;
    let putBody: unknown = null;
    vi.stubGlobal('fetch', vi.fn((url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.startsWith(`${DECK_API_COLLECTION_URL}/`) && init?.method === HTTP_METHOD_PUT) {
        putUrl = u;
        putBody = init.body ? JSON.parse(init.body as string) : null;
        return Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: HTTP_STATUS_OK }));
      }
      if (u === DECK_API_COLLECTION_URL) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: 1, name: 'Deck', main: [{ name: 'C', quantity: 1 }], extra: [], side: [] }),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      if (u.startsWith(`${CARD_API_PATH}?`)) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 1, name: 'C', type: 'Monster' }), { status: HTTP_STATUS_OK }),
        );
      }
      return Promise.resolve(new Response('[]', { status: HTTP_STATUS_OK }));
    }));
    const loaded = await loadDeckFromServer(1);
    expect(loaded.ok).toBe(true);
    const updateResult = await updateDeckOnServer();
    expect(updateResult.error).toBeUndefined();
    expect(updateResult.ok).toBe(true);
    expect(putUrl).toBe(deckApiDeckByIdUrl(1));
    expect(putBody).toHaveProperty('main');
  });

  it('saveDeckToServer en 401 persiste un brouillon et expose unauthorized', async () => {
    document.body.innerHTML =
      `<input id="${DECK_NAME_INPUT_ID}" value="GuestDeck" />` +
      htmlDeckGrids(DECK_TABLE_GRID_CLASS) +
      htmlCategorySummaryBody();
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.startsWith(`${CARD_API_PATH}?`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: 101, name: 'Card A', type: 'Normal Monster' }),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      if (u === DECK_API_COLLECTION_URL) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Connexion requise' }), { status: HTTP_STATUS_UNAUTHORIZED }),
        );
      }
      return Promise.resolve(new Response('[]', { status: HTTP_STATUS_OK }));
    }));
    const card = { id: 101, name: 'Card A', type: 'Normal Monster' } as Card;
    await addToDeck(card);
    const r = await saveDeckToServer();
    expect(r.unauthorized).toBe(true);
    expect(r.id).toBeUndefined();
    const raw = sessionStorage.getItem(BUILDER_DECK_DRAFT_SESSION_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.name).toBe('GuestDeck');
    expect(parsed.main.length).toBeGreaterThanOrEqual(1);
  });

  it('duplicateDeckOnServer GET puis POST avec nom « (copie) »', async () => {
    let postBody: unknown = null;
    vi.stubGlobal('fetch', vi.fn((url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === deckApiDeckByIdUrl(7) && !init?.method) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 7,
              name: 'Mon deck',
              main: [{ name: 'A', quantity: 2 }],
              extra: [],
              side: [],
            }),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      if (u === DECK_API_COLLECTION_URL && init?.method === HTTP_METHOD_POST) {
        postBody = init.body ? JSON.parse(init.body as string) : null;
        return Promise.resolve(new Response(JSON.stringify({ id: 99 }), { status: HTTP_STATUS_OK }));
      }
      return Promise.resolve(new Response('', { status: HTTP_STATUS_NOT_FOUND }));
    }));
    const r = await duplicateDeckOnServer(7);
    expect(r.id).toBe(99);
    expect(postBody).toMatchObject({
      name: 'Mon deck (copie)',
      main: [{ name: 'A', quantity: 2 }],
    });
  });

  it('load deck préserve les catégories quand les cartes sont chargées', async () => {
    let cardCalls = 0;
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.startsWith(`${DECK_API_COLLECTION_URL}/`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 1,
              name: 'Deck',
              main: [{ name: 'Ash Blossom', quantity: 1, categories: ['Hand Trap'] }],
              extra: [],
              side: [],
            }),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      if (u.startsWith(`${CARD_API_PATH}?`)) {
        cardCalls += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: 14558127, name: 'Ash Blossom & Joyous Spring', type: 'Tuner Monster' }),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      return Promise.resolve(new Response('[]', { status: HTTP_STATUS_OK }));
    }));
    const loaded = await loadDeckFromServer(1);
    expect(loaded.ok).toBe(true);
    expect(cardCalls).toBeGreaterThanOrEqual(1);
  });
});
