// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DECK_BTN_CLEAR_DECK_ID,
  DECK_BTN_REFRESH_DECKS_ID,
  DECK_BTN_SAVE_SERVER_ID,
  DECK_BTN_UPDATE_SERVER_ID,
  DECK_MY_DECKS_EMPTY_ID,
  DECK_MY_DECKS_LIST_ID,
  DECK_SAVED_ITEM_CLASS,
  DECK_TABLE_GRID_CLASS,
} from '../deck-builder/deckConstants.js';
import { DECK_API_COLLECTION_URL } from '../deck-builder/deckApiRoutes.js';
import {
  DRAW_SIMULATION_COUNT_ID,
  DRAW_SIMULATION_LIST_ID,
  DRAW_SIMULATION_MAX_ID,
  DRAW_SIM_BTN_DRAW_ONE_ID,
  DRAW_SIM_BTN_DRAW_RESET_ID,
  DRAW_SIM_BTN_HAND_5_ID,
  DRAW_SIM_BTN_HAND_6_ID,
  DRAW_SIM_HAND_DATA_ATTR,
  DRAW_SIM_HAND_SIZE_BTN_CLASS,
} from '../analysis/drawSimulationDomIds.js';
import { DATA_PAGE_ATTR } from '../appPageDomSelectors.js';
import { TAB_ID_DECKS } from '../tabs.js';
import { STYLE_DISPLAY_NONE } from '../utils/cssInlineDisplay.js';
import { HTTP_METHOD_POST, HTTP_STATUS_OK, HTTP_STATUS_UNAUTHORIZED } from '../utils/httpMime.js';
import { DOM_EVENT_DOM_CONTENT_LOADED } from '../utils/domEventNames.js';
import {
  SEARCH_BOX_ELEMENT_ID,
  SEARCH_RESULTS_CONTAINER_ID,
  SEARCH_RESULTS_LIST_ID,
} from '../searchDomIds.js';
import { htmlCategorySummaryBody, htmlDeckCountCells, htmlDeckCountSummary, htmlDeckGrids } from './helpers/deckTestDom.js';

/** Laisser résoudre fetch / microtâches après un clic (assertions async). */
const MAIN_TEST_POST_CLICK_YIELD_MS = 50;

/** DOM minimal pour que main.ts et ses listeners ne plantent pas. */
function minimalDeckDOM() {
  document.body.innerHTML =
    htmlDeckCountSummary() +
    htmlDeckCountCells() +
    htmlDeckGrids(DECK_TABLE_GRID_CLASS) +
    htmlCategorySummaryBody() +
    `<input id="${SEARCH_BOX_ELEMENT_ID}" /><div id="${SEARCH_RESULTS_CONTAINER_ID}"><div id="${SEARCH_RESULTS_LIST_ID}"></div></div>` +
    `<button id="${DECK_BTN_CLEAR_DECK_ID}"></button>` +
    `<button id="${DECK_BTN_SAVE_SERVER_ID}"></button>` +
    `<button id="${DECK_BTN_UPDATE_SERVER_ID}" style="display:${STYLE_DISPLAY_NONE}"></button>` +
    `<div ${DATA_PAGE_ATTR}="${TAB_ID_DECKS}"><button id="${DECK_BTN_REFRESH_DECKS_ID}"></button>` +
    `<ul id="${DECK_MY_DECKS_LIST_ID}"></ul><p id="${DECK_MY_DECKS_EMPTY_ID}"></p></div>` +
    `<button id="${DRAW_SIM_BTN_HAND_5_ID}" class="${DRAW_SIM_HAND_SIZE_BTN_CLASS}" ${DRAW_SIM_HAND_DATA_ATTR}="5"></button>` +
    `<button id="${DRAW_SIM_BTN_HAND_6_ID}" class="${DRAW_SIM_HAND_SIZE_BTN_CLASS}" ${DRAW_SIM_HAND_DATA_ATTR}="6"></button>` +
    `<button id="${DRAW_SIM_BTN_DRAW_ONE_ID}"></button><button id="${DRAW_SIM_BTN_DRAW_RESET_ID}"></button>` +
    `<div id="${DRAW_SIMULATION_LIST_ID}"></div><span id="${DRAW_SIMULATION_COUNT_ID}"></span><span id="${DRAW_SIMULATION_MAX_ID}"></span>`;
}

function mockFetchDefault(): ReturnType<typeof vi.fn> {
  return vi.fn((url: string | URL, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes(DECK_API_COLLECTION_URL) && init?.method === HTTP_METHOD_POST) {
      return Promise.resolve(new Response(JSON.stringify({ id: 99 }), { status: HTTP_STATUS_OK }));
    }
    return Promise.resolve(new Response(JSON.stringify([]), { status: HTTP_STATUS_OK }));
  }) as unknown as ReturnType<typeof vi.fn>;
}

describe('main.ts — intégration DOM', () => {
  beforeEach(() => {
    minimalDeckDOM();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('prompt', vi.fn().mockReturnValue('Test Deck'));
    vi.stubGlobal('fetch', mockFetchDefault());
  });

  it('DOMContentLoaded initialise sans exception (deck et stats)', async () => {
    await import('../main.js');
    expect(() => document.dispatchEvent(new Event(DOM_EVENT_DOM_CONTENT_LOADED))).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });

  it('clic sur btn-save-server appelle fetch avec POST /decks et payload deck', async () => {
    const postCalls: RequestInit[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes(DECK_API_COLLECTION_URL) && init?.method === HTTP_METHOD_POST) {
        postCalls.push(init);
        return Promise.resolve(new Response(JSON.stringify({ id: 42 }), { status: HTTP_STATUS_OK }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: HTTP_STATUS_OK }));
    }));
    await import('../main.js');
    document.dispatchEvent(new Event(DOM_EVENT_DOM_CONTENT_LOADED));
    await Promise.resolve();
    await Promise.resolve();
    document.getElementById(DECK_BTN_SAVE_SERVER_ID)?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(postCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse((postCalls[0].body as string) || '{}');
    expect(body).toHaveProperty('name', 'Test Deck');
    expect(body).toHaveProperty('main');
    expect(body).toHaveProperty('extra');
    expect(body).toHaveProperty('side');
  });

  it('save échoué affiche une alerte et ne corrompt pas l’état', async () => {
    const alertSpy = vi.mocked(alert);
    vi.stubGlobal('fetch', vi.fn((url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes(DECK_API_COLLECTION_URL) && init?.method === HTTP_METHOD_POST) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Unauthorized' }), { status: HTTP_STATUS_UNAUTHORIZED }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: HTTP_STATUS_OK }));
    }));
    await import('../main.js');
    document.dispatchEvent(new Event(DOM_EVENT_DOM_CONTENT_LOADED));
    await Promise.resolve();
    await Promise.resolve();
    document.getElementById(DECK_BTN_SAVE_SERVER_ID)?.click();
    await new Promise((r) => setTimeout(r, MAIN_TEST_POST_CLICK_YIELD_MS));
    expect(alertSpy).toHaveBeenCalled();
    expect(alertSpy.mock.calls.some((c) => String(c[0]).includes('Erreur'))).toBe(true);
  });

  it('clic sur btn-refresh-decks remplit la liste des decks', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === DECK_API_COLLECTION_URL) {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: 10, name: 'Mon deck', is_public: false, created_at: '2024-01-01' }]),
            { status: HTTP_STATUS_OK },
          ),
        );
      }
      return Promise.resolve(new Response('[]', { status: HTTP_STATUS_OK }));
    }));
    await import('../main.js');
    document.dispatchEvent(new Event(DOM_EVENT_DOM_CONTENT_LOADED));
    await Promise.resolve();
    await Promise.resolve();
    const list = document.getElementById(DECK_MY_DECKS_LIST_ID);
    const refreshBtn = document.getElementById(DECK_BTN_REFRESH_DECKS_ID);
    refreshBtn?.click();
    await new Promise((r) => setTimeout(r, MAIN_TEST_POST_CLICK_YIELD_MS));
    expect(list?.querySelectorAll(`li.${DECK_SAVED_ITEM_CLASS}`).length).toBe(1);
    expect(list?.textContent).toContain('Mon deck');
  });
}); 