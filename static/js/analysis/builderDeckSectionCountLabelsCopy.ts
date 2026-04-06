/**
 * Libellés affichés à côté des comptes par zone dans le résumé builder (ex. « 40 MAIN »).
 */

import type { DeckSection } from '../deckSection.js';

export const BUILDER_DECK_COUNT_LABEL_MAIN = 'MAIN';

export const BUILDER_DECK_COUNT_LABEL_EXTRA = 'EXTRA';

export const BUILDER_DECK_COUNT_LABEL_SIDE = 'SIDE';

export const BUILDER_DECK_SECTION_COUNT_LABEL: Record<DeckSection, string> = {
    main: BUILDER_DECK_COUNT_LABEL_MAIN,
    extra: BUILDER_DECK_COUNT_LABEL_EXTRA,
    side: BUILDER_DECK_COUNT_LABEL_SIDE,
};

/** Séparateur entre les segments « {n} MAIN », « {n} EXTRA », « {n} SIDE » (ligne résumé builder). */
export const BUILDER_DECK_SECTION_SUMMARY_SEPARATOR = ' / ';
