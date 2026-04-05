/**
 * Grilles deck : classes DnD et attributs `data-deck-cell-*` (cellules / grilles).
 */

export const DECK_SECTIONS_ROOT_CLASS = 'deck-sections';
export const DECK_CARDS_GRID_CLASS = 'deck-cards-grid';
export const DECK_CARDS_GRID_DND_OVER_CLASS = 'deck-cards-grid--dnd-over';
export const DECK_CARD_CELL_DRAGGING_CLASS = 'deck-card-cell--dragging';

export const DATA_DECK_CELL_SECTION_ATTR = 'data-deck-cell-section';
export const DATA_DECK_CELL_INDEX_ATTR = 'data-deck-cell-index';

export const DECK_CELL_HAS_SECTION_SELECTOR = `[${DATA_DECK_CELL_SECTION_ATTR}]`;
export const DECK_CELL_HAS_INDEX_SELECTOR = `[${DATA_DECK_CELL_INDEX_ATTR}]`;

export const DECK_SECTIONS_ROOT_SELECTOR = `.${DECK_SECTIONS_ROOT_CLASS}`;
export const DECK_CARDS_GRID_SELECTOR = `.${DECK_CARDS_GRID_CLASS}`;
export const DECK_CARDS_GRID_DND_OVER_SELECTOR = `.${DECK_CARDS_GRID_DND_OVER_CLASS}`;

/** Sélecteur d’une cellule deck par zone + index (grille). */
export function deckCellSelector(section: string, index: number): string {
    return `[${DATA_DECK_CELL_SECTION_ATTR}="${section}"][${DATA_DECK_CELL_INDEX_ATTR}="${index}"]`;
}

export const DECK_SECTION_CLASS = 'deck-section';
export const DECK_SECTION_SELECTOR = `.${DECK_SECTION_CLASS}`;
export const DECK_SECTION_COLLAPSED_CLASS = 'deck-section--collapsed';

export const DECK_CARD_CELL_CLASS = 'deck-card-cell';
export const DECK_CARD_CELL_SELECTOR = `.${DECK_CARD_CELL_CLASS}`;

/** Modificateur BEM `--monster` | `--spell` | `--trap` sur la cellule grille. */
export const DECK_CARD_CELL_TYPE_KIND_CLASS = {
    monster: `${DECK_CARD_CELL_CLASS}--monster`,
    spell: `${DECK_CARD_CELL_CLASS}--spell`,
    trap: `${DECK_CARD_CELL_CLASS}--trap`,
} as const;

export type DeckCardCellTypeKind = keyof typeof DECK_CARD_CELL_TYPE_KIND_CLASS;

/** Classes complètes du wrapper cellule (base + modificateur type). */
export function deckCardCellWrapperClassName(kind: DeckCardCellTypeKind): string {
    return `${DECK_CARD_CELL_CLASS} ${DECK_CARD_CELL_TYPE_KIND_CLASS[kind]}`;
}

/** Conteneur vignette dans une cellule grille. */
export const DECK_CARD_THUMB_WRAPPER_CLASS = 'deck-card-thumb';
export const DECK_CARD_THUMB_IMG_CLASS = 'deck-card-thumb-img';
export const DECK_CARD_THUMB_PLACEHOLDER_CLASS = 'deck-card-thumb-placeholder';

export const DECK_CARD_BAN_BADGE_CLASS = 'deck-card-ban-badge';

export const DECK_CARD_REMOVE_ONE_BTN_CLASS = 'deck-card-remove-one';
export const DECK_CARD_REMOVE_ONE_BTN_SELECTOR = `.${DECK_CARD_REMOVE_ONE_BTN_CLASS}`;
export const DECK_CARD_REMOVE_ONE_ICON_CLASS = 'deck-card-remove-one-icon';

export const DECK_CARD_QTY_CLASS = 'deck-card-qty';
export const DECK_CARD_QTY_SELECTOR = `.${DECK_CARD_QTY_CLASS}`;
