/**
 * Ordre canonique des zones deck (source unique pour clés, itération, indices).
 * Séparé de `deckSection.ts` pour éviter un import circulaire avec les libellés Main/Side.
 */

export const DECK_SECTIONS = ['main', 'extra', 'side'] as const;
export type DeckSection = (typeof DECK_SECTIONS)[number];
