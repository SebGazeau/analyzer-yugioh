/**
 * Résout l’URL d’illustration d’une carte du Main à partir du nom affiché.
 */

import { cleanDeckCardDisplayName } from './categorySummaryData.js';

export interface DeckMainRowWithImage {
    name: string;
    imageUrl?: string;
}

export function findMainDeckCardImageUrl(
    main: ReadonlyArray<DeckMainRowWithImage>,
    cardName: string,
): string | null {
    const want = cleanDeckCardDisplayName(cardName);
    const row = main.find((r) => cleanDeckCardDisplayName(r.name) === want);
    return row?.imageUrl ?? null;
}
