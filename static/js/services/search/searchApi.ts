/**
 * Appels HTTP recherche cartes (sans glue DOM).
 */
import { searchApiUrl } from '../../cardSearchApiRoutes.js';
import { SEARCH_MIN_QUERY_LENGTH } from '../../searchConstants.js';
import { searchLocaleQuery } from './searchCardPresentation.js';
import type { SearchApiCard } from './searchApiTypes.js';

function warnSearch(context: string, detail?: unknown): void {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(`[search] ${context}`, detail ?? '');
    }
}

/** Interprète le JSON d’une réponse liste cartes (recherche). */
export function parseSearchResultsJson(data: unknown): SearchApiCard[] {
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is SearchApiCard => x != null && typeof x === 'object') as SearchApiCard[];
}

export type SearchFetchOutcome =
    | { ok: true; cards: SearchApiCard[] }
    | { ok: false; status?: number; error?: unknown };

/**
 * Requête recherche avec distinction succès / échec (pour UI : message d’erreur vs liste vide).
 */
export async function fetchSearchResultsWithOutcome(q: string): Promise<SearchFetchOutcome> {
    const t = q.trim();
    if (t.length < SEARCH_MIN_QUERY_LENGTH) return { ok: true, cards: [] };
    try {
        const res = await fetch(searchApiUrl(t, searchLocaleQuery()));
        if (!res.ok) {
            warnSearch(`HTTP ${res.status}`);
            return { ok: false, status: res.status };
        }
        const data: unknown = await res.json();
        return { ok: true, cards: parseSearchResultsJson(data) };
    } catch (e) {
        warnSearch('fetch failed', e);
        return { ok: false, error: e };
    }
}

/**
 * Requête recherche (même locale que le builder).
 * En cas d’échec : tableau vide + avertissement console (comportement silencieux pour appels hors UI liste).
 */
export async function fetchSearchResultsForQuery(q: string): Promise<SearchApiCard[]> {
    const o = await fetchSearchResultsWithOutcome(q);
    return o.ok ? o.cards : [];
}
