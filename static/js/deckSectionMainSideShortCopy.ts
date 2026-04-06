/**
 * Zones Main / Side : type dérivé du tuple canonique + libellés courts (puces Suggestions, titres, etc.).
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
