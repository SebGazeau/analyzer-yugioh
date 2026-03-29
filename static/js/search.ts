import { addToDeck } from './deck.js';
import { openAssociatedCardsModal } from './associations/modal.js';
import { debounce } from './utils/debounce.js';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 4;

/** Query `locale` pour `/search` : aligné sur `<html lang>` (ex. fr → cartes `card_locales.fr`). */
function searchLocaleQuery(): string {
    const raw = document.documentElement.lang?.trim().toLowerCase() || '';
    if (!raw || raw.startsWith('en')) return '';
    const base = raw.split('-')[0];
    if (!base) return '';
    return `&locale=${encodeURIComponent(base)}`;
}

type SearchFilter = 'all' | 'monster' | 'spell' | 'trap';

function getCardTypeKind(card: { type?: string }): 'monster' | 'spell' | 'trap' {
    const t = (card.type ?? '').toLowerCase();
    if (t.includes('monster')) return 'monster';
    if (t.includes('spell')) return 'spell';
    if (t.includes('trap')) return 'trap';
    return 'monster';
}

function getSubtypeLine(card: any): string {
    const t = (card.type ?? '').toLowerCase();
    const race = card.race ?? '';
    const level = card.level != null ? card.level : '';
    if (t.includes('monster')) {
        const part = race || card.type || '';
        return level ? `${part} · ${level}★` : part;
    }
    return card.type || '';
}

let lastResults: any[] = [];
let lastQuery = '';
let activeFilter: SearchFilter = 'all';

function filterCards(cards: any[], filter: SearchFilter): any[] {
    if (filter === 'all') return cards;
    return cards.filter((c) => getCardTypeKind(c) === filter);
}

function renderResultRow(card: any, query: string, results: HTMLElement): void {
    const kind = getCardTypeKind(card);
    const letter = kind === 'monster' ? 'M' : kind === 'spell' ? 'S' : 'T';
    // `name` est la locale demandée quand le backend applique `card_locales` ; `name_en` reste l’anglais si présent.
    const mainName = card.name ?? card.name_en ?? '';
    const subtype = getSubtypeLine(card);
    const imgUrl = card.image_url;
    const thumbContent = imgUrl
        ? `<img class="search-result-thumb-img" src="${escapeAttr(imgUrl)}" alt="" loading="lazy" />`
        : `<span class="search-result-initial search-result-initial--${kind}" aria-hidden="true">${letter}</span>`;

    const row = document.createElement('div');
    row.className = 'search-result-row';
    row.innerHTML = `
        <div class="search-result-thumb">${thumbContent}</div>
        <div class="search-result-info">
            <span class="search-result-name">${highlightMatch(mainName, query)}</span>
            <span class="search-result-subtype">${escapeHtml(subtype)}</span>
        </div>
        <div class="search-result-actions">
            <button type="button" class="search-result-add search-result-add--deck" title="Ajouter au deck (Main/Extra)" aria-label="Ajouter au deck">+</button>
            <button type="button" class="search-result-add search-result-add--side" title="Ajouter au Side" aria-label="Ajouter au Side">Side</button>
            <button type="button" class="search-result-associated" data-search-action="associated" title="Cartes associées (catalogue complet)">c. associés</button>
        </div>
    `;
    row.querySelector('.search-result-add--deck')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addToDeck(card);
    });
    row.querySelector('.search-result-add--side')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addToDeck(card, 'side');
    });
    row.querySelector('[data-search-action="associated"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        void openAssociatedCardsModal(card as Record<string, unknown>);
    });
    row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        addToDeck(card);
    });
    results.appendChild(row);
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function renderResultsList(cards: any[], query: string, resultsEl: HTMLElement): void {
    resultsEl.innerHTML = '';
    const filtered = filterCards(cards, activeFilter);
    filtered.forEach((card) => renderResultRow(card, query, resultsEl));
}

/** Remplit la recherche du builder et lance une requête (ex. depuis l’onglet Suggestions). */
export function runSearchWithQuery(q: string): void {
    const input = document.getElementById('search-box') as HTMLInputElement | null;
    if (!input) return;
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    input.value = trimmed;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function setupSearch(): void {
    const input = document.getElementById('search-box') as HTMLInputElement | null;
    const resultsContainer = document.getElementById('searchResults') as HTMLElement | null;
    const results = document.getElementById('search-results-list') as HTMLElement | null;
    if (!input || !resultsContainer || !results) return;

    const runSearch = () => {
        const query = input.value.trim();
        resultsContainer.removeAttribute('data-search-error');
        if (query.length < MIN_QUERY_LENGTH) {
            results.innerHTML = '';
            lastResults = [];
            lastQuery = '';
            return;
        }

        fetch(`/search?q=${encodeURIComponent(query)}${searchLocaleQuery()}`)
            .then((res) => {
                if (!res.ok) throw new Error(String(res.status));
                return res.json();
            })
            .then((data: any[]) => {
                const cards = data || [];
                lastResults = cards;
                lastQuery = query;
                renderResultsList(cards, query, results);
                resultsContainer.style.display = 'flex';
            })
            .catch(() => {
                results.innerHTML = '';
                const errEl = document.createElement('div');
                errEl.className = 'search-error-state';
                errEl.setAttribute('data-search-error', 'true');
                errEl.textContent = 'Erreur de recherche. Réessayez.';
                results.appendChild(errEl);
                resultsContainer.style.display = 'flex';
                resultsContainer.setAttribute('data-search-error', 'true');
            });
    };

    document.querySelectorAll('.search-filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const filter = (btn.getAttribute('data-search-filter') ?? 'all') as SearchFilter;
            activeFilter = filter;
            document.querySelectorAll('.search-filter-btn').forEach((b) => {
                const f = b.getAttribute('data-search-filter');
                const active = f === filter;
                b.classList.toggle('active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            if (lastResults.length > 0) renderResultsList(lastResults, lastQuery, results);
        });
    });

    const debouncedSearch = debounce(runSearch, SEARCH_DEBOUNCE_MS);

    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (query.length < MIN_QUERY_LENGTH) {
            results.innerHTML = '';
            lastResults = [];
            lastQuery = '';
            resultsContainer.style.display = 'none';
            resultsContainer.removeAttribute('data-search-error');
            return;
        }
        debouncedSearch();
    });
}

export function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

export function closeSearch(): void {
    const el = document.getElementById('searchResults') as HTMLElement | null;
    if (el) el.style.display = 'none';
}

/** Vide l'input et ferme le panneau (raccourci Escape). */
export function clearSearch(): void {
    const input = document.getElementById('search-box') as HTMLInputElement | null;
    if (input) input.value = '';
    closeSearch();
}

/** Focus sur le champ recherche (raccourci Ctrl+F). */
export function focusSearch(): void {
    document.getElementById('search-box')?.focus();
}
