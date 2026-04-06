/**
 * Messages et libellés `title` / `aria-label` du widget recherche (builder).
 */

/** Message affiché si la requête de recherche échoue (réseau / serveur). */
export const SEARCH_FETCH_ERROR_MESSAGE = 'Erreur de recherche. Réessayez.';

/** Attribut `title` des boutons d’action par ligne de résultat. */
export const SEARCH_RESULT_BTN_ADD_DECK_TITLE = 'Ajouter au deck (Main/Extra)';
export const SEARCH_RESULT_BTN_ADD_SIDE_TITLE = 'Ajouter au Side';
export const SEARCH_RESULT_BTN_ASSOCIATED_TITLE = 'Cartes associées (catalogue complet)';

/** Attribut `aria-label` (cohérent avec les `title` quand pertinent). */
export const SEARCH_RESULT_BTN_ADD_DECK_ARIA_LABEL = 'Ajouter au deck';
export const SEARCH_RESULT_BTN_ADD_SIDE_ARIA_LABEL = 'Ajouter au Side';
export const SEARCH_RESULT_BTN_ASSOCIATED_ARIA_LABEL = SEARCH_RESULT_BTN_ASSOCIATED_TITLE;
