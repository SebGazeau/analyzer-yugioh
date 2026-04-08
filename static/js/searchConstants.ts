/**
 * Constantes du widget recherche (builder) : debounce, longueur minimale.
 * La longueur minimale est aussi le seuil pour le fallback `/search` dans `fetchCardByName` (`api.ts`).
 */

export const SEARCH_DEBOUNCE_MS = 300;

/** Délai avant mise à jour de l’aperçu carte (survol liste de résultats). */
export const SEARCH_PREVIEW_DEBOUNCE_MS = 200;

/** Longueur minimale de requête pour appeler `/search` (widget + `fetchSearchResultsForQuery`). */
export const SEARCH_MIN_QUERY_LENGTH = 4;

/**
 * Dépassement au-delà de {@link SEARCH_DEBOUNCE_MS} pour les tests à `vi.useFakeTimers`
 * (laisser le `setTimeout` du `debounce` se déclencher).
 */
export const SEARCH_DEBOUNCE_TEST_OVERRUN_MS = 50;
