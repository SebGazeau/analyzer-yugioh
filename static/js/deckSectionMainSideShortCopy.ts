/**
 * Libellés courts affichés pour les zones Main / Side (puces Suggestions, titres, etc.).
 */

import { DECK_SECTIONS } from './deckSectionOrder.js';

export const DECK_SECTION_MAIN_SIDE_SHORT_LABEL = {
    [DECK_SECTIONS[0]]: 'Main',
    [DECK_SECTIONS[2]]: 'Side',
} as const;
