// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { closeSearch, escapeAttr, highlightMatch, pickBestCardFromSearchResults, setupSearch } from '../search.js';
import {
  SEARCH_BOX_ELEMENT_ID,
  SEARCH_RESULTS_CONTAINER_ID,
  SEARCH_RESULTS_LIST_ID,
} from '../searchDomIds.js';
import {
  DATA_SEARCH_ARCHETYPE_SOURCE_ATTR,
  DATA_SEARCH_ERROR_ATTR,
  SEARCH_ERROR_STATE_CLASS,
  SEARCH_RESULT_META_CLASS,
  SEARCH_RESULT_ROW_CLASS,
} from '../searchDomSelectors.js';
import results3 from './fixtures/search/results-3-cards.json';

describe('search.ts — helpers purs', () => {
  describe('highlightMatch', () => {
    it('encadre la requête dans un <mark>', () => {
      const result = highlightMatch('Dark Magician', 'Magician');
      expect(result).toContain('<mark');
      expect(result).toContain('Magician');
    });

    it('est insensible à la casse', () => {
      const result = highlightMatch('Dark Magician', 'magician');
      expect(result).toContain('<mark');
      expect(result).toContain('Magician');
    });

    it('échappe les caractères spéciaux regex dans la requête', () => {
      const result = highlightMatch('Test (card)', '(');
      expect(result).toContain('<mark');
    });

    it('requête vide retourne le texte inchangé (sans mark)', () => {
      const text = 'Blue-Eyes';
      expect(highlightMatch(text, '')).toBe(text);
    });
  });

  describe('escapeAttr', () => {
    it('échappe & " < > pour usage en attribut HTML', () => {
      expect(escapeAttr('a & b')).toBe('a &amp; b');
      expect(escapeAttr('say "hi"')).toBe('say &quot;hi&quot;');
      expect(escapeAttr('<img>')).toBe('&lt;img&gt;');
    });
  });

  describe('pickBestCardFromSearchResults', () => {
    it('préfère l’égalité exacte sur name / name_en', () => {
      const cards = [
        { id: 1, name: 'Number C101: Silent Honor DARK', name_en: 'Number C101: Silent Honor DARK' },
        { id: 2, name: 'Number 101: Silent Honor ARK', name_en: 'Number 101: Silent Honor ARK' },
      ];
      const pick = pickBestCardFromSearchResults(cards, 'Number 101: Silent Honor ARK');
      expect(pick?.id).toBe(2);
    });

    it('retombe sur le premier résultat si aucune égalité', () => {
      const cards = [{ id: 9, name: 'A', name_en: 'B' }];
      expect(pickBestCardFromSearchResults(cards, 'Z')?.id).toBe(9);
    });
  });
});

describe('search.ts — DOM', () => {
  beforeEach(() => {
    document.body.innerHTML =
      `<input id="${SEARCH_BOX_ELEMENT_ID}" type="text" />` +
      `<div id="${SEARCH_RESULTS_CONTAINER_ID}" style="display:none">` +
      `<div id="${SEARCH_RESULTS_LIST_ID}"></div>` +
      '</div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('input avec moins de 4 caractères ne déclenche pas de fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]'));
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('input avec 4+ caractères déclenche un fetch après le debounce', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ name: 'Test', name_en: 'Test' }])),
    );
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    input.value = 'Dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(fetchSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(350);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/search?q=Dark'));
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('ajoute locale= à la requête quand <html lang> est non anglais', async () => {
    vi.useFakeTimers();
    const prevLang = document.documentElement.lang;
    document.documentElement.lang = 'fr';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ name: 'Test', name_en: 'Test' }])),
    );
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    input.value = 'abcd';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringMatching(/\/search\?q=abcd&locale=fr/));
    document.documentElement.lang = prevLang;
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('typing rapide ne déclenche qu’un seul fetch (debounce)', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([])),
    );
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    input.value = 'D';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'Da';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'Dar';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'Dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/search?q=Dark'));
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('résultats de recherche remplissent le DOM avec les noms de cartes', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(results3)),
    );
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    const list = document.getElementById(SEARCH_RESULTS_LIST_ID)!;
    input.value = 'Dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    await Promise.resolve();
    const items = list.querySelectorAll(`.${SEARCH_RESULT_ROW_CLASS}`);
    expect(items.length).toBe(3);
    // Affichage prioritaire sur `name` (locale API), puis `name_en`.
    expect(list.textContent).toContain('Magicien Sombre');
    expect(list.textContent).toContain('Dragon Blanc aux Yeux Bleus');
    expect(list.textContent).toContain('Trou Noir');
    const firstRow = list.querySelector(`.${SEARCH_RESULT_ROW_CLASS}`);
    const meta = firstRow?.querySelector(`.${SEARCH_RESULT_META_CLASS}`);
    expect(meta?.textContent).toContain('Magician');
    const badge = firstRow?.querySelector(`[${DATA_SEARCH_ARCHETYPE_SOURCE_ATTR}="ygorg_effect_en"]`);
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('YGOrg');
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('réponse vide affiche liste vide (pas de crash)', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([])),
    );
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    const list = document.getElementById(SEARCH_RESULTS_LIST_ID)!;
    input.value = 'XyZz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    expect(list.querySelectorAll(`.${SEARCH_RESULT_ROW_CLASS}`).length).toBe(0);
    expect(list.innerHTML).toBe('');
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('vider l’input vide la liste des résultats', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ name: 'Card', name_en: 'Card' }])),
    );
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    const list = document.getElementById(SEARCH_RESULTS_LIST_ID)!;
    input.value = 'Card';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    expect(list.querySelectorAll(`.${SEARCH_RESULT_ROW_CLASS}`).length).toBe(1);
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(list.innerHTML).toBe('');
    vi.useRealTimers();
  });

  it('erreur réseau affiche un état d’erreur sans propager d’exception', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    setupSearch();
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement;
    const container = document.getElementById(SEARCH_RESULTS_CONTAINER_ID)!;
    const list = document.getElementById(SEARCH_RESULTS_LIST_ID)!;
    input.value = 'Dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    expect(container.getAttribute(DATA_SEARCH_ERROR_ATTR)).toBe('true');
    expect(list.querySelector(`.${SEARCH_ERROR_STATE_CLASS}`)).not.toBeNull();
    expect(list.textContent).toContain('Erreur');
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('closeSearch cache le panneau de résultats', () => {
    document.body.innerHTML =
      `<div id="${SEARCH_RESULTS_CONTAINER_ID}" style="display:block"><div id="${SEARCH_RESULTS_LIST_ID}"></div></div>`;
    const el = document.getElementById(SEARCH_RESULTS_CONTAINER_ID) as HTMLElement;
    expect(el.style.display).toBe('block');
    closeSearch();
    expect(el.style.display).toBe('none');
  });
}); 