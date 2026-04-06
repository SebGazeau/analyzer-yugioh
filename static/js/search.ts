import { addToDeck } from './deck.js';
import {
    SEARCH_BOX_ELEMENT_ID,
    SEARCH_RESULTS_CONTAINER_ID,
    SEARCH_RESULTS_LIST_ID,
} from './searchDomIds.js';
import {
    DATA_SEARCH_ACTION_ATTR,
    DATA_SEARCH_ERROR_ATTR,
    DATA_SEARCH_FILTER_ATTR,
    SEARCH_ACTION_ASSOCIATED_SELECTOR,
    SEARCH_ERROR_STATE_CLASS,
    SEARCH_FETCH_ERROR_MESSAGE,
    SEARCH_FILTER_BTN_ACTIVE_CLASS,
    SEARCH_FILTER_BTN_CLASS,
    SEARCH_HIGHLIGHT_CLASS,
    SEARCH_RESULT_ADD_DECK_SELECTOR,
    SEARCH_RESULT_ADD_SIDE_SELECTOR,
    SEARCH_RESULT_ASSOCIATED_CLASS,
    SEARCH_RESULT_ROW_CLASS,
} from './searchDomSelectors.js';
import { openAssociatedCardsModal } from './associations/modal.js';
import {
    searchResultArchetypeSourceBadgeHtml,
    searchResultRowFragmentHtml,
    searchResultThumbInnerHtml,
} from './searchResultRowHtml.js';
import { debounce } from './utils/debounce.js';
import { ARIA_PRESSED_ATTR } from './utils/ariaAttrs.js';
import { NATIVE_BUTTON_SELECTOR } from './utils/dom.js';
import {
    STYLE_DISPLAY_FLEX,
    STYLE_DISPLAY_NONE,
} from './utils/cssInlineDisplay.js';
import { cardTypeKindFromTypeString } from './utils/cardTypeKind.js';
import { escapeHtml, escapeAttr } from './utils/html.js';
import { TEXT_BLACK_STAR, TEXT_MIDDLE_DOT } from './utils/textPlaceholders.js';

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

function getSubtypeLine(card: any): string {
    const t = (card.type ?? '').toLowerCase();
    const race = card.race ?? '';
    const level = card.level != null ? card.level : '';
    const arch =
        typeof card.archetype === 'string' && card.archetype.trim() ? card.archetype.trim() : '';
    if (t.includes('monster')) {
        const part = race || card.type || '';
        const line = level ? `${part} ${TEXT_MIDDLE_DOT} ${level}${TEXT_BLACK_STAR}` : part;
        return arch ? `${line} ${TEXT_MIDDLE_DOT} ${arch}` : line;
    }
    return card.type || '';
}

let lastResults: any[] = [];
let lastQuery = '';
let activeFilter: SearchFilter = 'all';

function filterCards(cards: any[], filter: SearchFilter): any[] {
    if (filter === 'all') return cards;
    return cards.filter((c) => cardTypeKindFromTypeString(c.type) === filter);
}

function renderResultRow(card: any, query: string, results: HTMLElement): void {
    const kind = cardTypeKindFromTypeString(card.type);
    // `name` est la locale demandée quand le backend applique `card_locales` ; `name_en` reste l’anglais si présent.
    const mainName = card.name ?? card.name_en ?? '';
    const subtype = getSubtypeLine(card);
    const thumbInner = searchResultThumbInnerHtml(card.image_url, kind);
    const row = document.createElement('div');
    row.className = SEARCH_RESULT_ROW_CLASS;
    row.innerHTML = searchResultRowFragmentHtml({
        nameHighlightedHtml: highlightMatch(mainName, query),
        subtypeEscapedHtml: escapeHtml(subtype),
        archetypeBadgeHtml: searchResultArchetypeSourceBadgeHtml(card.archetype_source),
        thumbInnerHtml: thumbInner,
    });
    row.querySelector(SEARCH_RESULT_ADD_DECK_SELECTOR)?.addEventListener('click', (e) => {
        e.stopPropagation();
        addToDeck(card);
    });
    row.querySelector(SEARCH_RESULT_ADD_SIDE_SELECTOR)?.addEventListener('click', (e) => {
        e.stopPropagation();
        addToDeck(card, 'side');
    });
    row.querySelector(SEARCH_ACTION_ASSOCIATED_SELECTOR)?.addEventListener('click', (e) => {
        e.stopPropagation();
        void openAssociatedCardsModal(card as Record<string, unknown>);
    });
    row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest(NATIVE_BUTTON_SELECTOR)) return;
        addToDeck(card);
    });
    results.appendChild(row);
}

function renderResultsList(cards: any[], query: string, resultsEl: HTMLElement): void {
    resultsEl.innerHTML = '';
    const filtered = filterCards(cards, activeFilter);
    filtered.forEach((card) => renderResultRow(card, query, resultsEl));
}

/** Requête brute `/search` (même locale que le builder). */
export async function fetchSearchResultsForQuery(q: string): Promise<any[]> {
    const t = q.trim();
    if (t.length < MIN_QUERY_LENGTH) return [];
    const res = await fetch(`/search?q=${encodeURIComponent(t)}${searchLocaleQuery()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

function normName(s: string): string {
    return String(s ?? '')
        .trim()
        .toLowerCase();
}

/**
 * Choisit la carte la plus probable dans les résultats (égalité nom / name_en avec l’intention, sinon 1ʳᵉ).
 */
export function pickBestCardFromSearchResults(cards: any[], intendedName: string): any | null {
    if (!cards.length) return null;
    const target = normName(intendedName);
    if (!target) return cards[0];
    for (const c of cards) {
        const main = normName(c.name ?? '');
        const en = normName(c.name_en ?? '');
        if (main === target || en === target) return c;
    }
    return cards[0];
}

/** Remplit la recherche du builder et lance une requête (ex. depuis l’onglet Suggestions). */
export function runSearchWithQuery(q: string): void {
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement | null;
    if (!input) return;
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    input.value = trimmed;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function setupSearch(): void {
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement | null;
    const resultsContainer = document.getElementById(SEARCH_RESULTS_CONTAINER_ID) as HTMLElement | null;
    const results = document.getElementById(SEARCH_RESULTS_LIST_ID) as HTMLElement | null;
    if (!input || !resultsContainer || !results) return;

    const runSearch = () => {
        const query = input.value.trim();
        resultsContainer.removeAttribute(DATA_SEARCH_ERROR_ATTR);
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
                resultsContainer.style.display = STYLE_DISPLAY_FLEX;
            })
            .catch(() => {
                results.innerHTML = '';
                const errEl = document.createElement('div');
                errEl.className = SEARCH_ERROR_STATE_CLASS;
                errEl.setAttribute(DATA_SEARCH_ERROR_ATTR, 'true');
                errEl.textContent = SEARCH_FETCH_ERROR_MESSAGE;
                results.appendChild(errEl);
                resultsContainer.style.display = STYLE_DISPLAY_FLEX;
                resultsContainer.setAttribute(DATA_SEARCH_ERROR_ATTR, 'true');
            });
    };

    document.querySelectorAll(`.${SEARCH_FILTER_BTN_CLASS}`).forEach((btn) => {
        btn.addEventListener('click', () => {
            const filter = (btn.getAttribute(DATA_SEARCH_FILTER_ATTR) ?? 'all') as SearchFilter;
            activeFilter = filter;
            document.querySelectorAll(`.${SEARCH_FILTER_BTN_CLASS}`).forEach((b) => {
                const f = b.getAttribute(DATA_SEARCH_FILTER_ATTR);
                const active = f === filter;
                b.classList.toggle(SEARCH_FILTER_BTN_ACTIVE_CLASS, active);
                b.setAttribute(ARIA_PRESSED_ATTR, String(active));
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
            resultsContainer.style.display = STYLE_DISPLAY_NONE;
            resultsContainer.removeAttribute(DATA_SEARCH_ERROR_ATTR);
            return;
        }
        debouncedSearch();
    });
}

export { escapeAttr };

export function highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, `<mark class="${SEARCH_HIGHLIGHT_CLASS}">$1</mark>`);
}

export function closeSearch(): void {
    const el = document.getElementById(SEARCH_RESULTS_CONTAINER_ID) as HTMLElement | null;
    if (el) el.style.display = STYLE_DISPLAY_NONE;
}

/** Vide l'input et ferme le panneau (raccourci Escape). */
export function clearSearch(): void {
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement | null;
    if (input) input.value = '';
    closeSearch();
}

/** Focus sur le champ recherche (raccourci Ctrl+F). */
export function focusSearch(): void {
    document.getElementById(SEARCH_BOX_ELEMENT_ID)?.focus();
}
