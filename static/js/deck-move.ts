/**
 * Logique pure déplacement / réorganisation des cartes (drag-and-drop builder).
 */

import { DECK_SECTIONS, type DeckSection } from './deckSection.js';

export type { DeckSection };

export interface DeckRowLike {
    type: string;
    frame_type?: string;
    quantity: number;
}

/** Minimum de cartes en Main pour un deck légal (construction classique). */
export const MIN_MAIN_CARDS = 40;

export const MAX_MAIN_CARDS = 60;
export const MAX_EXTRA_CARDS = 15;
export const MAX_SIDE_CARDS = 15;

export function sumQuantities(rows: { quantity: number }[]): number {
    return rows.reduce((s, r) => s + r.quantity, 0);
}

/** Fusion / Synchro / Xyz / Link (type ou frame_type). */
export function isExtraDeckRowLike(row: DeckRowLike): boolean {
    const t = (row.type || '').toLowerCase();
    const f = (row.frame_type || '').toLowerCase();
    return (
        t.includes('fusion') ||
        t.includes('synchro') ||
        t.includes('xyz') ||
        t.includes('link') ||
        f.includes('fusion') ||
        f.includes('synchro') ||
        f.includes('xyz') ||
        f.includes('link')
    );
}

/**
 * Zone effective pour une carte : une carte Extra ne peut pas aller en Main (→ Extra).
 * Une carte non-Extra ne peut pas aller en Extra (→ null).
 */
export function resolveTargetZone(row: DeckRowLike, requested: DeckSection): DeckSection | null {
    if (requested === DECK_SECTIONS[1] && !isExtraDeckRowLike(row)) return null;
    if (requested === DECK_SECTIONS[0] && isExtraDeckRowLike(row)) return DECK_SECTIONS[1];
    return requested;
}

/**
 * Réordonnancement dans la même zone : index d'insertion après retrait de `fromIdx`.
 * `dropOnIdx` = insérer avant cette carte. `null` = pas de changement (même cellule).
 */
export function sameZoneInsertIndex(fromIdx: number, dropOnIdx: number, length: number): number | null {
    if (fromIdx === dropOnIdx) return null;
    if (dropOnIdx < 0 || dropOnIdx > length) return null;
    if (fromIdx < dropOnIdx) return dropOnIdx - 1;
    return dropOnIdx;
}

const MAX_CARDS_BY_ZONE: Record<DeckSection, number> = {
    [DECK_SECTIONS[0]]: MAX_MAIN_CARDS,
    [DECK_SECTIONS[1]]: MAX_EXTRA_CARDS,
    [DECK_SECTIONS[2]]: MAX_SIDE_CARDS,
};

export function maxCardsForZone(zone: DeckSection): number {
    return MAX_CARDS_BY_ZONE[zone];
}
