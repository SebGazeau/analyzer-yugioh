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
