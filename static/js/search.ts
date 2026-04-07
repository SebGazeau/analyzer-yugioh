import { addToDeck } from './deck.js';
import { DECK_SECTIONS } from './deckSectionOrder.js';
import {
    SEARCH_BOX_ELEMENT_ID,
    SEARCH_RESULTS_CONTAINER_ID,
    SEARCH_RESULTS_LIST_ID,
} from './searchDomIds.js';
import {
    DATA_SEARCH_ERROR_ATTR,
    DATA_SEARCH_FILTER_ATTR,
    SEARCH_ACTION_ASSOCIATED_SELECTOR,
    SEARCH_FILTER_BTN_ACTIVE_CLASS,
    SEARCH_FILTER_BTN_CLASS,
    SEARCH_RESULT_ADD_DECK_SELECTOR,
    SEARCH_RESULT_ADD_SIDE_SELECTOR,
    SEARCH_RESULT_ROW_CLASS,
} from './searchDomSelectors.js';
import { openAssociatedCardsModal } from './associations/modal.js';
import {
    searchResultArchetypeSourceBadgeHtml,
    searchResultRowFragmentHtml,
    searchResultThumbInnerHtml,
} from './searchResultRowHtml.js';
import { searchResultsFetchErrorRowHtml } from './searchFetchErrorHtml.js';
import { debounce } from './utils/debounce.js';
import { ARIA_PRESSED_ATTR } from './utils/ariaAttrs.js';
import { NATIVE_BUTTON_SELECTOR } from './utils/dom.js';
import {
    STYLE_DISPLAY_FLEX,
    STYLE_DISPLAY_NONE,
} from './utils/cssInlineDisplay.js';
import { cardTypeKindFromTypeString } from './utils/cardTypeKind.js';
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_QUERY_LENGTH } from './searchConstants.js';
import { DOM_EVENT_CLICK, DOM_EVENT_INPUT } from './utils/domEventNames.js';
import {
    SEARCH_FILTER_ALL,
    type SearchFilter,
} from './searchFilterConstants.js';
import { escapeHtml, escapeAttr } from './utils/html.js';
import { filterCards, getSubtypeLine } from './services/search/searchCardPresentation.js';
import {
    fetchSearchResultsForQuery as fetchSearchResultsForQueryFromApi,
    fetchSearchResultsWithOutcome,
} from './services/search/searchApi.js';
import type { SearchApiCard } from './services/search/searchApiTypes.js';
import { highlightMatch } from './searchHighlightHtml.js';

/**
 * Module façade : glue DOM + filtres pour la recherche du builder.
 * Transport HTTP et types : `services/search/searchApi.ts`.
 */
let lastResults: SearchApiCard[] = [];
let lastQuery = '';
let activeFilter: SearchFilter = SEARCH_FILTER_ALL;

function renderResultRow(card: SearchApiCard, query: string, results: HTMLElement): void {
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
    row.querySelector(SEARCH_RESULT_ADD_DECK_SELECTOR)?.addEventListener(DOM_EVENT_CLICK, (e) => {
        e.stopPropagation();
        addToDeck(card);
    });
    row.querySelector(SEARCH_RESULT_ADD_SIDE_SELECTOR)?.addEventListener(DOM_EVENT_CLICK, (e) => {
        e.stopPropagation();
        addToDeck(card, DECK_SECTIONS[2]);
    });
    row.querySelector(SEARCH_ACTION_ASSOCIATED_SELECTOR)?.addEventListener(DOM_EVENT_CLICK, (e) => {
        e.stopPropagation();
        void openAssociatedCardsModal(card as Record<string, unknown>);
    });
    row.addEventListener(DOM_EVENT_CLICK, (e) => {
        if ((e.target as HTMLElement).closest(NATIVE_BUTTON_SELECTOR)) return;
        addToDeck(card);
    });
    results.appendChild(row);
}

function renderResultsList(cards: SearchApiCard[], query: string, resultsEl: HTMLElement): void {
    resultsEl.innerHTML = '';
    const filtered = filterCards(cards, activeFilter);
    filtered.forEach((card) => renderResultRow(card, query, resultsEl));
}

/** Requête brute recherche (même locale que le builder). Réexport du service. */
export async function fetchSearchResultsForQuery(q: string): Promise<SearchApiCard[]> {
    return fetchSearchResultsForQueryFromApi(q);
}

function normName(s: string): string {
    return String(s ?? '')
        .trim()
        .toLowerCase();
}

/**
 * Choisit la carte la plus probable dans les résultats (égalité nom / name_en avec l’intention, sinon 1ʳᵉ).
 */
export function pickBestCardFromSearchResults(
    cards: SearchApiCard[],
    intendedName: string,
): SearchApiCard | null {
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
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return;
    input.value = trimmed;
    input.dispatchEvent(new Event(DOM_EVENT_INPUT, { bubbles: true }));
}

export function setupSearch(): void {
    const input = document.getElementById(SEARCH_BOX_ELEMENT_ID) as HTMLInputElement | null;
    const resultsContainer = document.getElementById(SEARCH_RESULTS_CONTAINER_ID) as HTMLElement | null;
    const results = document.getElementById(SEARCH_RESULTS_LIST_ID) as HTMLElement | null;
    if (!input || !resultsContainer || !results) return;

    const runSearch = () => {
        const query = input.value.trim();
        resultsContainer.removeAttribute(DATA_SEARCH_ERROR_ATTR);
        if (query.length < SEARCH_MIN_QUERY_LENGTH) {
            results.innerHTML = '';
            lastResults = [];
            lastQuery = '';
            return;
        }

        void fetchSearchResultsWithOutcome(query).then((out) => {
            if (!out.ok) {
                results.innerHTML = searchResultsFetchErrorRowHtml();
                resultsContainer.style.display = STYLE_DISPLAY_FLEX;
                resultsContainer.setAttribute(DATA_SEARCH_ERROR_ATTR, 'true');
                lastResults = [];
                return;
            }
            lastResults = out.cards;
            lastQuery = query;
            renderResultsList(out.cards, query, results);
            resultsContainer.style.display = STYLE_DISPLAY_FLEX;
        });
    };

    document.querySelectorAll(`.${SEARCH_FILTER_BTN_CLASS}`).forEach((btn) => {
        btn.addEventListener(DOM_EVENT_CLICK, () => {
            const filter = (btn.getAttribute(DATA_SEARCH_FILTER_ATTR) ?? SEARCH_FILTER_ALL) as SearchFilter;
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

    input.addEventListener(DOM_EVENT_INPUT, () => {
        const query = input.value.trim();
        if (query.length < SEARCH_MIN_QUERY_LENGTH) {
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
export { highlightMatch } from './searchHighlightHtml.js';

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
