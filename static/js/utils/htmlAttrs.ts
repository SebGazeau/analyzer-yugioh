/**
 * Noms d'attributs HTML récurrents côté JS (complète `ariaAttrs.ts`).
 */

export const ROLE_ATTR = 'role';
export const TABINDEX_ATTR = 'tabindex';
export const HIDDEN_ATTR = 'hidden';
export const TITLE_ATTR = 'title';
export const DRAGGABLE_ATTR = 'draggable';

/** Valeurs usuelles de `role`. */
export const ROLE_BUTTON = 'button';
export const ROLE_DIALOG = 'dialog';
export const ROLE_DOCUMENT = 'document';
export const ROLE_STATUS = 'status';

export const TABINDEX_ZERO = '0';
export const DRAGGABLE_TRUE = 'true';
export const DRAGGABLE_FALSE = 'false';

/**
 * Valeur de `element.dataset.*` pour marquer un branchement one-shot déjà posé (idempotence JS).
 */
export const HTML_DATASET_VALUE_BOUND = '1';

/** `<button type="button">` (évite soumission implicite dans un formulaire). */
export const BTN_TYPE_ATTR = 'type';
export const BTN_TYPE_BUTTON = 'button';

/** Attributs `<img>` (lazy-load, décodage). */
export const IMG_LOADING_ATTR = 'loading';
export const IMG_LOADING_LAZY = 'lazy';
export const IMG_LOADING_EAGER = 'eager';
export const IMG_DECODING_ATTR = 'decoding';
export const IMG_DECODING_ASYNC = 'async';
