/**
 * Libellés affichés à côté des comptes par zone dans le résumé builder (ex. « 40 MAIN »).
 */

import { DECK_SECTIONS, type DeckSection } from '../deckSectionOrder.js';

export const BUILDER_DECK_COUNT_LABEL_MAIN = 'MAIN';

export const BUILDER_DECK_COUNT_LABEL_EXTRA = 'EXTRA';

export const BUILDER_DECK_COUNT_LABEL_SIDE = 'SIDE';

export const BUILDER_DECK_SECTION_COUNT_LABEL: Record<DeckSection, string> = {
    [DECK_SECTIONS[0]]: BUILDER_DECK_COUNT_LABEL_MAIN,
    [DECK_SECTIONS[1]]: BUILDER_DECK_COUNT_LABEL_EXTRA,
    [DECK_SECTIONS[2]]: BUILDER_DECK_COUNT_LABEL_SIDE,
};

/** Séparateur entre les segments « {n} MAIN », « {n} EXTRA », « {n} SIDE » (ligne résumé builder). */
export const BUILDER_DECK_SECTION_SUMMARY_SEPARATOR = ' / ';
