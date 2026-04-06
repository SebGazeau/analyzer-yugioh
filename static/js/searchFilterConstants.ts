/**
 * Valeurs de `data-search-filter` (widget recherche builder).
 * Doivent rester alignées sur `templates/components/search-card.html`.
 */

export const SEARCH_FILTER_ALL = 'all';
export const SEARCH_FILTER_MONSTER = 'monster';
export const SEARCH_FILTER_SPELL = 'spell';
export const SEARCH_FILTER_TRAP = 'trap';

export type SearchFilter =
    | typeof SEARCH_FILTER_ALL
    | typeof SEARCH_FILTER_MONSTER
    | typeof SEARCH_FILTER_SPELL
    | typeof SEARCH_FILTER_TRAP;
