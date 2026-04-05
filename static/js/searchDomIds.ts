/**
 * IDs du widget recherche (builder) — alignés sur les templates Tera.
 */

export const SEARCH_BOX_ELEMENT_ID = 'search-box';

/** Conteneur du panneau résultats (`display` flex/none). */
export const SEARCH_RESULTS_CONTAINER_ID = 'searchResults';

export const SEARCH_RESULTS_LIST_ID = 'search-results-list';

/** Premier bouton « ajouter » dans la liste (raccourci Enter depuis la search box). */
export const SEARCH_RESULTS_FIRST_ADD_BUTTON_SELECTOR = `#${SEARCH_RESULTS_LIST_ID} .search-result-add`;
