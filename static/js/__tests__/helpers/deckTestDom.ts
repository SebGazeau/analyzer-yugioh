/**
 * Snippets HTML pour tests jsdom — IDs alignés sur {@link DECK_GRID_IDS} et compteurs `deck-{section}-count`.
 */
import { DECK_GRID_IDS } from '../../deck-builder/deckConstants.js';
import { DECK_SECTIONS, mapDeckSections } from '../../deckSection.js';

const DECK_COUNT_ELEMENT_IDS = mapDeckSections((s) => `deck-${s}-count`);

/** Grille Main uniquement (stats / scénarios partiels). */
export function htmlDeckMainGrid(className?: string): string {
    const id = DECK_GRID_IDS.main;
    return className != null && className !== ''
        ? `<div id="${id}" class="${className}"></div>`
        : `<div id="${id}"></div>`;
}

/** Les trois grilles Main / Extra / Side. */
export function htmlDeckGrids(className?: string): string {
    return DECK_SECTIONS.map((s) => {
        const id = DECK_GRID_IDS[s];
        return className != null && className !== ''
            ? `<div id="${id}" class="${className}"></div>`
            : `<div id="${id}"></div>`;
    }).join('');
}

/** Les trois cellules de comptage builder (`deck-main-count`, …). */
export function htmlDeckCountCells(): string {
    return DECK_SECTIONS.map((s) => `<div id="${DECK_COUNT_ELEMENT_IDS[s]}"></div>`).join('');
}
