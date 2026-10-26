/**
 * IDs du widget recherche (builder) — alignés sur les templates Tera.
 */

import { SEARCH_RESULT_ADD_BASE_CLASS } from './searchDomSelectors.js';

export const SEARCH_BOX_ELEMENT_ID = 'search-box';

/** Conteneur du panneau résultats (`display` flex/none). */
export const SEARCH_RESULTS_CONTAINER_ID = 'searchResults';

export const SEARCH_RESULTS_LIST_ID = 'search-results-list';

/** Aperçu flottant au survol des résultats (nœud créé dans setupSearch). */
export const SEARCH_CARD_FLOAT_ROOT_ID = 'search-card-float';
export const SEARCH_CARD_FLOAT_LIVE_ID = 'search-card-float-live';
export const SEARCH_CARD_FLOAT_INNER_ID = 'search-card-float-inner';

/** Premier bouton « ajouter » dans la liste (raccourci Enter depuis la search box). */
export const SEARCH_RESULTS_FIRST_ADD_BUTTON_SELECTOR = `#${SEARCH_RESULTS_LIST_ID} .${SEARCH_RESULT_ADD_BASE_CLASS}`;
