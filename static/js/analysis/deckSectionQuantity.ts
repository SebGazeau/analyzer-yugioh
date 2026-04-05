/**
 * Comptage de cartes par zone du deck (pur).
 */

import type { DeckSection } from '../deckSection.js';

export interface DeckStateWithQuantities {
    main: ReadonlyArray<{ quantity: number }>;
    extra: ReadonlyArray<{ quantity: number }>;
    side: ReadonlyArray<{ quantity: number }>;
}

export function countCardsInDeckSection(state: DeckStateWithQuantities, section: DeckSection): number {
    return state[section].reduce((sum, r) => sum + r.quantity, 0);
}
