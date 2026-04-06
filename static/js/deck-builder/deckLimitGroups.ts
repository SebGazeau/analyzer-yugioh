/**
 * Règles banlist TCG et groupes d’exemplaires (*always treated as*, passcode, nom).
 * L’état du deck (main/extra/side) est passé en argument pour rester sans effet de bord.
 */

import { DECK_DEFAULT_MAX_COPIES_PER_CARD } from './deckConstants.js';

/** Clé : plusieurs lignes partagent la même limite si même deckCopyId / id / nom. */
export type DeckLimitGroupKey = number | string;

/** Champs d’une ligne nécessaires aux calculs de limite. */
export interface DeckRowLimitFields {
    name: string;
    quantity: number;
    maxCopies?: number;
    cardId?: number;
    deckCopyId?: number;
}

export function deckLimitGroupKeyRow(r: DeckRowLimitFields): DeckLimitGroupKey {
    if (r.deckCopyId != null && r.deckCopyId > 0) return r.deckCopyId;
    if (r.cardId != null && r.cardId > 0) return `id:${r.cardId}`;
    return `n:${r.name}`;
}

export function deckLimitGroupKeyFromCard(
    card: { id?: unknown; deck_copy_id?: unknown },
    displayName: string,
): DeckLimitGroupKey {
    const dc = card.deck_copy_id;
    if (typeof dc === 'number' && dc > 0) return dc;
    const id = card.id;
    if (typeof id === 'number' && id > 0) return `id:${id}`;
    return `n:${displayName}`;
}

/** Forbidden=0, Limited=1, Semi-Limited=2, sinon {@link DECK_DEFAULT_MAX_COPIES_PER_CARD}. */
export function banTcgToMaxCopies(ban: string | undefined): number {
    const s = (ban ?? '').toLowerCase();
    if (s.includes('forbidden') || s === 'banned') return 0;
    if (s.includes('limited') && !s.includes('semi')) return 1;
    if (s.includes('semi')) return 2;
    return DECK_DEFAULT_MAX_COPIES_PER_CARD;
}

export function rowsInDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
): DeckRowLimitFields[] {
    return allRows.filter((r) => deckLimitGroupKeyRow(r) === key);
}

export function totalQtyDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
): number {
    return rowsInDeckLimitGroup(allRows, key).reduce((s, r) => s + r.quantity, 0);
}

/** Plafond du groupe : min(max TCG normal, banlist de chaque ligne + carte ajoutée). */
export function maxAllowedForDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
    incomingMaxCopies: number,
): number {
    const caps = rowsInDeckLimitGroup(allRows, key).map((r) => r.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD);
    return Math.min(DECK_DEFAULT_MAX_COPIES_PER_CARD, incomingMaxCopies, ...caps);
}

/** Peut-on ajouter `delta` exemplaires à ce groupe (toutes zones) ? */
export function canAddToDeckLimitGroup(
    allRows: readonly DeckRowLimitFields[],
    key: DeckLimitGroupKey,
    delta: number,
    incomingMaxCopies: number,
): boolean {
    if (delta <= 0) return true;
    const maxA = maxAllowedForDeckLimitGroup(allRows, key, incomingMaxCopies);
    return totalQtyDeckLimitGroup(allRows, key) + delta <= maxA;
}
