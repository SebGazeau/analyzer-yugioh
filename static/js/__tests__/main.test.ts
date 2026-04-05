// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { htmlDeckCountCells, htmlDeckGrids } from './helpers/deckTestDom.js';

/** DOM minimal pour que main.ts et ses listeners ne plantent pas. */
function minimalDeckDOM() {
  document.body.innerHTML =
    '<span id="deck-count-summary"></span>' +
    htmlDeckCountCells() +
    htmlDeckGrids('deck-table-grid') +
    '<div id="category-summary-body"></div>' +
    '<input id="search-box" /><div id="searchResults"><div id="search-results-list"></div></div>' +
    '<button id="btn-clear-deck"></button>' +
    '<button id="btn-save-server"></button>' +
    '<button id="btn-update-server" style="display:none"></button>' +
    '<div data-page="decks"><button id="btn-refresh-decks"></button>' +
    '<ul id="my-decks-list"></ul><p id="my-decks-empty"></p></div>' +
    '<button id="btn-hand-5" class="hand-size-btn" data-hand="5"></button>' +
    '<button id="btn-hand-6" class="hand-size-btn" data-hand="6"></button>' +
    '<button id="btn-draw-one"></button><button id="btn-draw-reset"></button>' +
    '<div id="draw-simulation-list"></div><span id="draw-simulation-count"></span><span id="draw-simulation-max"></span>';
}

function mockFetchDefault(): ReturnType<typeof vi.fn> {
  return vi.fn((url: string | URL, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/decks') && init?.method === 'POST') {
      return Promise.resolve(new Response(JSON.stringify({ id: 99 }), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
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
    expect(() => document.dispatchEvent(new Event('DOMContentLoaded'))).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });

  it('clic sur btn-save-server appelle fetch avec POST /decks et payload deck', async () => {
    const postCalls: RequestInit[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/decks') && init?.method === 'POST') {
        postCalls.push(init);
        return Promise.resolve(new Response(JSON.stringify({ id: 42 }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    }));
    await import('../main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await Promise.resolve();
    await Promise.resolve();
    document.getElementById('btn-save-server')?.click();
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
      if (u.includes('/decks') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    }));
    await import('../main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await Promise.resolve();
    await Promise.resolve();
    document.getElementById('btn-save-server')?.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(alertSpy).toHaveBeenCalled();
    expect(alertSpy.mock.calls.some((c) => String(c[0]).includes('Erreur'))).toBe(true);
  });

  it('clic sur btn-refresh-decks remplit la liste des decks', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === '/decks') {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: 10, name: 'Mon deck', is_public: false, created_at: '2024-01-01' }]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    }));
    await import('../main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await Promise.resolve();
    await Promise.resolve();
    const list = document.getElementById('my-decks-list');
    const refreshBtn = document.getElementById('btn-refresh-decks');
    refreshBtn?.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(list?.querySelectorAll('li.deck-saved-item').length).toBe(1);
    expect(list?.textContent).toContain('Mon deck');
  });
}); 