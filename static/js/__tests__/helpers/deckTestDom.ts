/**
 * Snippets HTML pour tests jsdom — IDs alignés sur {@link DECK_GRID_IDS}, {@link DECK_COUNT_ELEMENT_ID}, {@link builderShellDomIds}.
 */
import {
    CATEGORY_SUMMARY_BODY_ELEMENT_ID,
    DECK_COUNT_SUMMARY_ELEMENT_ID,
} from '../../analysis/builderShellDomIds.js';
import { DECK_COUNT_ELEMENT_ID } from '../../analysis/builderStatsDom.js';
import { DECK_GRID_IDS } from '../../deck-builder/deckConstants.js';
import { DECK_SECTIONS } from '../../deckSectionOrder.js';

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
    return DECK_SECTIONS.map((s) => `<div id="${DECK_COUNT_ELEMENT_ID[s]}"></div>`).join('');
}

/** Résumé texte MAIN / EXTRA / SIDE (ligne stats builder). */
export function htmlDeckCountSummary(): string {
    return `<span id="${DECK_COUNT_SUMMARY_ELEMENT_ID}"></span>`;
}

/** Tbody du tableau catégories (analysis). */
export function htmlCategorySummaryBody(): string {
    return `<div id="${CATEGORY_SUMMARY_BODY_ELEMENT_ID}"></div>`;
}
