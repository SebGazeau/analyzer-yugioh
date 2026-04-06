/**
 * Zones Main / Side : type, libellés, validation DOM, tri (Suggestions / insights).
 */

import { DECK_SECTIONS } from './deckSectionOrder.js';

/** Main ou Side uniquement (pas Extra). */
export type DeckSectionMainSide = (typeof DECK_SECTIONS)[0] | (typeof DECK_SECTIONS)[2];

export const DECK_SECTION_MAIN_SIDE_SHORT_LABEL = {
    [DECK_SECTIONS[0]]: 'Main',
    [DECK_SECTIONS[2]]: 'Side',
} as const;

/** Libellé court UI pour puce / tooltip (Suggestions, etc.). */
export function deckSectionMainSideShortLabel(section: DeckSectionMainSide): string {
    return DECK_SECTION_MAIN_SIDE_SHORT_LABEL[section];
}

/** Valide une chaîne issue du DOM comme Main ou Side uniquement (pas Extra). */
export function isDeckSectionMainSide(value: string): value is DeckSectionMainSide {
    return value === DECK_SECTIONS[0] || value === DECK_SECTIONS[2];
}

const MAIN_SIDE_SORT_KEY: Record<DeckSectionMainSide, number> = {
    [DECK_SECTIONS[0]]: 0,
    [DECK_SECTIONS[2]]: 1,
};

/** Clé de tri : Main avant Side (tie-break après le nom). */
export function deckSectionMainSideSortKey(section: DeckSectionMainSide): number {
    return MAIN_SIDE_SORT_KEY[section];
}
