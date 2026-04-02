/**
 * Comptage de cartes par zone du deck (pur).
 */

export type DeckGridSection = 'main' | 'extra' | 'side';

export interface DeckStateWithQuantities {
    main: ReadonlyArray<{ quantity: number }>;
    extra: ReadonlyArray<{ quantity: number }>;
    side: ReadonlyArray<{ quantity: number }>;
}

export function countCardsInDeckSection(state: DeckStateWithQuantities, section: DeckGridSection): number {
    return state[section].reduce((sum, r) => sum + r.quantity, 0);
}
