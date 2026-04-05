/**
 * Classes internes du popover « Modifier la carte ».
 */

export const DECK_CARD_POPOVER_QTY_CLASS = 'deck-card-popover-qty';
export const DECK_CARD_POPOVER_QTY_SELECTOR = `.${DECK_CARD_POPOVER_QTY_CLASS}`;

export const DECK_CARD_POPOVER_ENGINE_CLASS = 'deck-card-popover-engine';
export const DECK_CARD_POPOVER_ENGINE_SELECTOR = `.${DECK_CARD_POPOVER_ENGINE_CLASS}`;

export const DECK_CARD_POPOVER_CAT_CONTAINER_CLASS = 'deck-card-popover-cat-container';
export const DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR = `.${DECK_CARD_POPOVER_CAT_CONTAINER_CLASS}`;

export const DECK_CARD_POPOVER_DELETE_CLASS = 'deck-card-popover-delete';
export const DECK_CARD_POPOVER_DELETE_SELECTOR = `.${DECK_CARD_POPOVER_DELETE_CLASS}`;

export const DECK_CARD_POPOVER_CLOSE_CLASS = 'deck-card-popover-close';
export const DECK_CARD_POPOVER_CLOSE_SELECTOR = `.${DECK_CARD_POPOVER_CLOSE_CLASS}`;

export const DECK_CARD_POPOVER_COVER_CLASS = 'deck-card-popover-cover';
export const DECK_CARD_POPOVER_COVER_SELECTOR = `.${DECK_CARD_POPOVER_COVER_CLASS}`;

export const DECK_CARD_POPOVER_BACKDROP_CLASS = 'deck-card-popover-backdrop';
export const DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS = 'deck-card-popover-backdrop--open';

export const DECK_CARD_POPOVER_ROOT_CLASS = 'deck-card-popover';
export const DECK_CARD_POPOVER_OPEN_CLASS = 'deck-card-popover--open';
export const DECK_CARD_POPOVER_ABOVE_CLASS = 'deck-card-popover--above';

/** Modificateurs banlist sur le &lt;select&gt; quantité (0 / 1 / 2 exemplaires max). */
export const DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX = 'deck-card-popover-qty--limit-';
export const DECK_CARD_POPOVER_QTY_LIMIT_CLASSES = [
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}0`,
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}1`,
    `${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}2`,
] as const;

export const DATA_DECK_POPOVER_BACKDROP_ATTR = 'data-deck-popover-backdrop';
