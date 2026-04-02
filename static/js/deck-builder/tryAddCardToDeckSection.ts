/**
 * Fusion +1 ou nouvelle ligne lors d’un ajout au deck (pur côté tableaux).
 */

import type { Card } from '../api.js';
import type { DeckRow } from '../deck.js';
import {
    banTcgToMaxCopies,
    canAddToDeckLimitGroup,
    deckLimitGroupKeyFromCard,
} from './deckLimitGroups.js';
import { createDeckRowFromApiCard } from './deckRowFactory.js';

export type TryAddCardResult = { ok: true; mode: 'increment' | 'newRow' } | { ok: false };

function findExistingRowIndex(arr: readonly DeckRow[], card: Card, displayName: string): number {
    const cardId = typeof card.id === 'number' && card.id > 0 ? card.id : undefined;
    return arr.findIndex((r) => {
        if (cardId != null && r.cardId != null) return r.cardId === cardId;
        return r.name === displayName;
    });
}

/**
 * Mutate `arr` si les règles banlist / groupe le permettent.
 */
export function tryAddCardToDeckSection(
    card: Card,
    arr: DeckRow[],
    allRowsFlat: readonly DeckRow[],
): TryAddCardResult {
    const displayName = card.name_en ?? card.name;
    const cardId = typeof card.id === 'number' && card.id > 0 ? card.id : undefined;
    const incomingMax = banTcgToMaxCopies(typeof card.ban_tcg === 'string' ? card.ban_tcg : undefined);
    const limitKey = deckLimitGroupKeyFromCard(
        card as { id?: unknown; deck_copy_id?: unknown },
        displayName,
    );

    const existingIdx = findExistingRowIndex(arr, card, displayName);
    if (existingIdx >= 0) {
        if (!canAddToDeckLimitGroup(allRowsFlat, limitKey, 1, incomingMax)) return { ok: false };
        const row = arr[existingIdx];
        const max = row.maxCopies ?? 3;
        if (row.quantity >= max) return { ok: false };
        row.quantity += 1;
        return { ok: true, mode: 'increment' };
    }
    if (!canAddToDeckLimitGroup(allRowsFlat, limitKey, 1, incomingMax)) return { ok: false };

    arr.push(createDeckRowFromApiCard(card));
    return { ok: true, mode: 'newRow' };
}
