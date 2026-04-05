/**
 * Classes et attributs `data-*` du widget recherche (alignés sur templates + CSS).
 */

export const SEARCH_RESULT_ROW_CLASS = 'search-result-row';
export const SEARCH_RESULT_META_CLASS = 'search-result-meta';
export const SEARCH_FILTER_BTN_CLASS = 'search-filter-btn';
export const SEARCH_FILTER_BTN_ACTIVE_CLASS = 'active';

export const SEARCH_RESULT_ADD_DECK_CLASS = 'search-result-add search-result-add--deck';
export const SEARCH_RESULT_ADD_SIDE_CLASS = 'search-result-add search-result-add--side';
export const SEARCH_RESULT_ASSOCIATED_CLASS = 'search-result-associated';

/** Bouton générique « ajouter » (raccourci clavier — voir searchDomIds). */
export const SEARCH_RESULT_ADD_BASE_CLASS = 'search-result-add';
export const SEARCH_RESULT_ADD_DECK_SELECTOR = '.search-result-add--deck';
export const SEARCH_RESULT_ADD_SIDE_SELECTOR = '.search-result-add--side';

export const DATA_SEARCH_FILTER_ATTR = 'data-search-filter';
export const DATA_SEARCH_ACTION_ATTR = 'data-search-action';
export const SEARCH_ACTION_ASSOCIATED = 'associated';

export const SEARCH_ACTION_ASSOCIATED_SELECTOR = `[${DATA_SEARCH_ACTION_ATTR}="${SEARCH_ACTION_ASSOCIATED}"]`;

export const DATA_SEARCH_ARCHETYPE_SOURCE_ATTR = 'data-search-archetype-source';

export const SEARCH_ERROR_STATE_CLASS = 'search-error-state';
export const DATA_SEARCH_ERROR_ATTR = 'data-search-error';

/** Message affiché si la requête de recherche échoue (réseau / serveur). */
export const SEARCH_FETCH_ERROR_MESSAGE = 'Erreur de recherche. Réessayez.';

/** Attribut `title` des boutons d’action par ligne de résultat. */
export const SEARCH_RESULT_BTN_ADD_DECK_TITLE = 'Ajouter au deck (Main/Extra)';
export const SEARCH_RESULT_BTN_ADD_SIDE_TITLE = 'Ajouter au Side';
export const SEARCH_RESULT_BTN_ASSOCIATED_TITLE = 'Cartes associées (catalogue complet)';

export const SEARCH_RESULT_ARCH_SOURCE_CLASS = 'search-result-arch-source';

export const SEARCH_RESULT_THUMB_CLASS = 'search-result-thumb';
export const SEARCH_RESULT_THUMB_IMG_CLASS = 'search-result-thumb-img';

export const SEARCH_RESULT_INITIAL_CLASS = 'search-result-initial';
export const SEARCH_RESULT_INITIAL_KIND_CLASS = {
    monster: `${SEARCH_RESULT_INITIAL_CLASS}--monster`,
    spell: `${SEARCH_RESULT_INITIAL_CLASS}--spell`,
    trap: `${SEARCH_RESULT_INITIAL_CLASS}--trap`,
} as const;

export type SearchResultInitialKind = keyof typeof SEARCH_RESULT_INITIAL_KIND_CLASS;

export function searchResultInitialCellClass(kind: SearchResultInitialKind): string {
    return `${SEARCH_RESULT_INITIAL_CLASS} ${SEARCH_RESULT_INITIAL_KIND_CLASS[kind]}`;
}

export const SEARCH_RESULT_INFO_CLASS = 'search-result-info';
export const SEARCH_RESULT_NAME_CLASS = 'search-result-name';
export const SEARCH_RESULT_SUBTYPE_CLASS = 'search-result-subtype';
export const SEARCH_RESULT_ACTIONS_CLASS = 'search-result-actions';

export const SEARCH_HIGHLIGHT_CLASS = 'search-highlight';
