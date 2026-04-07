/**
 * IDs du widget recherche (builder) — alignés sur les templates Tera.
 */

import { SEARCH_RESULT_ADD_BASE_CLASS } from './searchDomSelectors.js';

export const SEARCH_BOX_ELEMENT_ID = 'search-box';

/** Conteneur du panneau résultats (`display` flex/none). */
export const SEARCH_RESULTS_CONTAINER_ID = 'searchResults';

export const SEARCH_RESULTS_LIST_ID = 'search-results-list';

/** Panneau aperçu (nom, stats, texte) sous les filtres de recherche. */
export const SEARCH_CARD_PREVIEW_ROOT_ID = 'search-card-preview';
export const SEARCH_CARD_PREVIEW_LIVE_ID = 'search-card-preview-live';
export const SEARCH_CARD_PREVIEW_INNER_ID = 'search-card-preview-inner';

/** Premier bouton « ajouter » dans la liste (raccourci Enter depuis la search box). */
export const SEARCH_RESULTS_FIRST_ADD_BUTTON_SELECTOR = `#${SEARCH_RESULTS_LIST_ID} .${SEARCH_RESULT_ADD_BASE_CLASS}`;
