/**
 * Délais pour le préchargement idle du catalogue associations (builder).
 */

/** `requestIdleCallback` : forcer l’exécution avant cette échéance si le main thread reste occupé (ms). */
export const ASSOCIATION_CATALOG_PREFETCH_IDLE_TIMEOUT_MS = 8000;

/** Si `requestIdleCallback` est absent : délai avant lancement du prefetch (ms). */
export const ASSOCIATION_CATALOG_PREFETCH_SET_TIMEOUT_MS = 2500;
