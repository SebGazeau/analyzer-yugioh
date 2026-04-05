/** Zones deck officielles : Main, Extra, Side (ordre d’itération = affichage builder). */

export const DECK_SECTIONS = ['main', 'extra', 'side'] as const;
export type DeckSection = (typeof DECK_SECTIONS)[number];

/** Nombre de cartes par zone (builder / résumé). */
export type DeckSectionCounts = Record<DeckSection, number>;

/** Main ou Side uniquement (pas Extra) — cibles d’ajout depuis Suggestions / insights. */
export type DeckSectionMainSide = Extract<DeckSection, 'main' | 'side'>;

/** Valide une chaîne issue du DOM (`data-deck-cell-section`, JSON DnD, etc.). */
export function isDeckSection(value: string): value is DeckSection {
    return (DECK_SECTIONS as readonly string[]).includes(value);
}

export function isDeckSectionMainSide(value: string): value is DeckSectionMainSide {
    return value === 'main' || value === 'side';
}
