// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { closeSearch, escapeAttr, highlightMatch, setupSearch } from '../search.js';
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
});

describe('search.ts — DOM', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<input id="search-box" type="text" />' +
      '<div id="searchResults" style="display:none">' +
      '<div id="search-results-list"></div>' +
      '</div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('input avec moins de 4 caractères ne déclenche pas de fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]'));
    setupSearch();
    const input = document.getElementById('search-box') as HTMLInputElement;
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
    const input = document.getElementById('search-box') as HTMLInputElement;
    input.value = 'Dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(fetchSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(350);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/search?q=Dark'));
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('typing rapide ne déclenche qu’un seul fetch (debounce)', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([])),
    );
    setupSearch();
    const input = document.getElementById('search-box') as HTMLInputElement;
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
    const input = document.getElementById('search-box') as HTMLInputElement;
    const list = document.getElementById('search-results-list')!;
    input.value = 'Dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    await Promise.resolve();
    const items = list.querySelectorAll('.search-result-row');
    expect(items.length).toBe(3);
    expect(list.textContent).toContain('Dark Magician');
    expect(list.textContent).toContain('Blue-Eyes White Dragon');
    const firstRow = list.querySelector('.search-result-row');
    const meta = firstRow?.querySelector('.search-result-meta');
    expect(meta?.textContent).toContain('Magician');
    const badge = firstRow?.querySelector('[data-search-archetype-source="ygorg_effect_en"]');
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
    const input = document.getElementById('search-box') as HTMLInputElement;
    const list = document.getElementById('search-results-list')!;
    input.value = 'XyZz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    expect(list.querySelectorAll('.search-result-row').length).toBe(0);
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
    const input = document.getElementById('search-box') as HTMLInputElement;
    const list = document.getElementById('search-results-list')!;
    input.value = 'Card';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    expect(list.querySelectorAll('.search-result-row').length).toBe(1);
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(list.innerHTML).toBe('');
    vi.useRealTimers();
  });

  it('erreur réseau affiche un état d’erreur sans propager d’exception', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    setupSearch();
    const input = document.getElementById('search-box') as HTMLInputElement;
    const container = document.getElementById('searchResults')!;
    const list = document.getElementById('search-results-list')!;
    input.value = 'Dark';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
    await Promise.resolve();
    expect(container.getAttribute('data-search-error')).toBe('true');
    expect(list.querySelector('.search-error-state')).not.toBeNull();
    expect(list.textContent).toContain('Erreur');
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  it('closeSearch cache le panneau de résultats', () => {
    document.body.innerHTML =
      '<div id="searchResults" style="display:block"><div id="search-results-list"></div></div>';
    const el = document.getElementById('searchResults') as HTMLElement;
    expect(el.style.display).toBe('block');
    closeSearch();
    expect(el.style.display).toBe('none');
  });
}); 