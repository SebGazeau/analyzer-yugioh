/** Zones deck officielles : Main, Extra, Side (ordre d’itération = affichage builder). */

export const DECK_SECTIONS = ['main', 'extra', 'side'] as const;
export type DeckSection = (typeof DECK_SECTIONS)[number];

/** Valide une chaîne issue du DOM (`data-deck-cell-section`, JSON DnD, etc.). */
export function isDeckSection(value: string): value is DeckSection {
    return (DECK_SECTIONS as readonly string[]).includes(value);
}
