/**
 * Comptage de cartes par zone du deck (pur).
 */

import type { DeckSection } from '../deckSectionOrder.js';

/** Deck dont chaque zone expose au moins `quantity` par ligne (stats / compteurs). */
export type DeckStateWithQuantities = Record<DeckSection, ReadonlyArray<{ quantity: number }>>;

export function countCardsInDeckSection(state: DeckStateWithQuantities, section: DeckSection): number {
    return state[section].reduce((sum, r) => sum + r.quantity, 0);
}
