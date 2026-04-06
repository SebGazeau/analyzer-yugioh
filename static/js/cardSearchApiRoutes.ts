/**
 * Chemins HTTP relatifs pour carte par nom et recherche.
 * Le suffixe `extraQuery` sert au paramètre `locale` (voir `searchLocaleQuery` dans `search.ts`).
 */

export const CARD_API_PATH = '/card';

export const CARD_API_NAME_QUERY = 'name';

export function cardApiByNameUrl(exactName: string): string {
    return `${CARD_API_PATH}?${CARD_API_NAME_QUERY}=${encodeURIComponent(exactName)}`;
}

export const SEARCH_API_PATH = '/search';

export const SEARCH_API_Q_QUERY = 'q';

export function searchApiUrl(query: string, extraQuerySuffix = ''): string {
    return `${SEARCH_API_PATH}?${SEARCH_API_Q_QUERY}=${encodeURIComponent(query)}${extraQuerySuffix}`;
}
