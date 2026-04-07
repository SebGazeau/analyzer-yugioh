import { addToDeck } from './deck.js';
import { DECK_SECTIONS } from './deckSectionOrder.js';
import {
    SEARCH_BOX_ELEMENT_ID,
    SEARCH_CARD_FLOAT_INNER_ID,
    SEARCH_CARD_FLOAT_LIVE_ID,
    SEARCH_CARD_FLOAT_ROOT_ID,
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
import {
    applySearchCardPreviewCard,
    buildSearchCardPreviewLiveText,
    resetSearchCardPreview,
    setSearchCardPreviewRootVisible,
} from './searchCardPreview.js';
import {
    DOM_EVENT_CLICK,
    DOM_EVENT_INPUT,
    DOM_EVENT_POINTERENTER,
    DOM_EVENT_POINTERLEAVE,
    DOM_EVENT_POINTERMOVE,
    DOM_EVENT_POINTEROVER,
} from './utils/domEventNames.js';
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
 *
 * Aperçu au survol : le panneau suit la souris ; le focus clavier sur les lignes
 * n’ouvre pas l’aperçu (comportement inchangé, limite connue).
 */
const SEARCH_FLOAT_OFFSET_PX = 14;
const SEARCH_FLOAT_VIEWPORT_PAD_PX = 8;
const SEARCH_FLOAT_HIDE_MS = 120;

function clampSearchFloatPosition(floatEl: HTMLElement, clientX: number, clientY: number): void {
    floatEl.style.position = 'fixed';
    const w = floatEl.offsetWidth;
    const h = floatEl.offsetHeight;
    let left = clientX + SEARCH_FLOAT_OFFSET_PX;
    let top = clientY + SEARCH_FLOAT_OFFSET_PX;
    const maxL = window.innerWidth - SEARCH_FLOAT_VIEWPORT_PAD_PX - w;
    const maxT = window.innerHeight - SEARCH_FLOAT_VIEWPORT_PAD_PX - h;
    const minL = SEARCH_FLOAT_VIEWPORT_PAD_PX;
    const minT = SEARCH_FLOAT_VIEWPORT_PAD_PX;
    if (left > maxL) left = maxL;
    if (top > maxT) top = maxT;
    if (left < minL) left = minL;
    if (top < minT) top = minT;
    floatEl.style.left = `${Math.round(left)}px`;
    floatEl.style.top = `${Math.round(top)}px`;
}

/** Crée ou retrouve le nœud fixed d’aperçu (hors flux du template). */
function ensureSearchCardFloat(): {
    root: HTMLElement;
    live: HTMLElement;
    inner: HTMLElement;
} | null {
    let root = document.getElementById(SEARCH_CARD_FLOAT_ROOT_ID) as HTMLElement | null;
    const liveExisting = document.getElementById(SEARCH_CARD_FLOAT_LIVE_ID) as HTMLElement | null;
    const innerExisting = document.getElementById(SEARCH_CARD_FLOAT_INNER_ID) as HTMLElement | null;
    if (root && liveExisting && innerExisting) {
        return { root, live: liveExisting, inner: innerExisting };
    }
    if (root?.parentNode) root.remove();
    root = document.createElement('div');
    root.id = SEARCH_CARD_FLOAT_ROOT_ID;
    root.className = 'search-card-float';
    root.setAttribute('hidden', '');
    root.setAttribute('aria-label', 'Aperçu de la carte');
    const live = document.createElement('p');
    live.id = SEARCH_CARD_FLOAT_LIVE_ID;
    live.className = 'search-card-preview__live';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    const inner = document.createElement('div');
    inner.id = SEARCH_CARD_FLOAT_INNER_ID;
    inner.className = 'search-card-preview__inner';
    root.appendChild(live);
    root.appendChild(inner);
    document.body.appendChild(root);
    return { root, live, inner };
}

let lastResults: SearchApiCard[] = [];
let lastQuery = '';
let activeFilter: SearchFilter = SEARCH_FILTER_ALL;

/** Carte affichée par ligne (aperçu au survol). */
const searchPreviewRowCards = new WeakMap<HTMLElement, SearchApiCard>();

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
    searchPreviewRowCards.set(row, card);
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

    const floatEls = ensureSearchCardFloat();
    if (!floatEls) return;
    const { root: previewRoot, live: previewLive, inner: previewInner } = floatEls;

    let lastClientX = 0;
    let lastClientY = 0;
    let rafPos: number | null = null;
    let hideTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const clearHideTimer = (): void => {
        if (hideTimer != null) {
            globalThis.clearTimeout(hideTimer);
            hideTimer = null;
        }
    };

    const scheduleReposition = (): void => {
        if (rafPos != null) return;
        rafPos = window.requestAnimationFrame(() => {
            rafPos = null;
            if (!previewRoot || previewRoot.hasAttribute('hidden')) return;
            clampSearchFloatPosition(previewRoot, lastClientX, lastClientY);
        });
    };

    const scheduleHideFloat = (): void => {
        clearHideTimer();
        hideTimer = globalThis.setTimeout(() => {
            hideTimer = null;
            resetSearchCardPreview(previewRoot, previewLive, previewInner);
        }, SEARCH_FLOAT_HIDE_MS);
    };

    const applyPreviewNow = (card: SearchApiCard): void => {
        previewLive.textContent = buildSearchCardPreviewLiveText(card);
        applySearchCardPreviewCard(previewInner, card);
        setSearchCardPreviewRootVisible(previewRoot, true);
        scheduleReposition();
        window.requestAnimationFrame(() => scheduleReposition());
    };

    previewRoot.addEventListener(DOM_EVENT_POINTERENTER, () => clearHideTimer());
    previewRoot.addEventListener(DOM_EVENT_POINTERLEAVE, () => scheduleHideFloat());

    results.addEventListener(DOM_EVENT_POINTEROVER, (e) => {
        const row = (e.target as HTMLElement).closest(`.${SEARCH_RESULT_ROW_CLASS}`) as HTMLElement | null;
        if (!row || !results.contains(row)) return;
        const card = searchPreviewRowCards.get(row);
        if (!card) return;
        clearHideTimer();
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        applyPreviewNow(card);
    });

    results.addEventListener(DOM_EVENT_POINTERMOVE, (e) => {
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        if (!previewRoot.hasAttribute('hidden')) scheduleReposition();
    });

    resultsContainer.addEventListener(DOM_EVENT_POINTERLEAVE, (e) => {
        const rel = e.relatedTarget as Node | null;
        if (rel && previewRoot.contains(rel)) return;
        scheduleHideFloat();
    });

    const runSearch = () => {
        const query = input.value.trim();
        resultsContainer.removeAttribute(DATA_SEARCH_ERROR_ATTR);
        if (query.length < SEARCH_MIN_QUERY_LENGTH) {
            results.innerHTML = '';
            lastResults = [];
            lastQuery = '';
            resetSearchCardPreview(previewRoot, previewLive, previewInner);
            return;
        }

        void fetchSearchResultsWithOutcome(query).then((out) => {
            if (!out.ok) {
                results.innerHTML = searchResultsFetchErrorRowHtml();
                resultsContainer.style.display = STYLE_DISPLAY_FLEX;
                resultsContainer.setAttribute(DATA_SEARCH_ERROR_ATTR, 'true');
                lastResults = [];
                resetSearchCardPreview(previewRoot, previewLive, previewInner);
                return;
            }
            lastResults = out.cards;
            lastQuery = query;
            renderResultsList(out.cards, query, results);
            resultsContainer.style.display = STYLE_DISPLAY_FLEX;
            resetSearchCardPreview(previewRoot, previewLive, previewInner);
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
            if (lastResults.length > 0) {
                renderResultsList(lastResults, lastQuery, results);
                resetSearchCardPreview(previewRoot, previewLive, previewInner);
            }
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
            resetSearchCardPreview(previewRoot, previewLive, previewInner);
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
    resetSearchCardPreview(
        document.getElementById(SEARCH_CARD_FLOAT_ROOT_ID) as HTMLElement | null,
        document.getElementById(SEARCH_CARD_FLOAT_LIVE_ID) as HTMLElement | null,
        document.getElementById(SEARCH_CARD_FLOAT_INNER_ID) as HTMLElement | null,
    );
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
