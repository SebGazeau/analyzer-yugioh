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
import { DECK_DEFAULT_MAX_COPIES_PER_CARD, DECK_DEFAULT_ROW_QUANTITY } from './deckConstants.js';
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
    const displayName = (card.name_en ?? card.name) ?? '';
    const cardId = typeof card.id === 'number' && card.id > 0 ? card.id : undefined;
    const incomingMax = banTcgToMaxCopies(typeof card.ban_tcg === 'string' ? card.ban_tcg : undefined);
    const limitKey = deckLimitGroupKeyFromCard(
        card as { id?: unknown; deck_copy_id?: unknown },
        displayName,
    );

    const existingIdx = findExistingRowIndex(arr, card, displayName);
    if (existingIdx >= 0) {
        if (!canAddToDeckLimitGroup(allRowsFlat, limitKey, DECK_DEFAULT_ROW_QUANTITY, incomingMax))
            return { ok: false };
        const row = arr[existingIdx];
        const max = row.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD;
        if (row.quantity >= max) return { ok: false };
        row.quantity += DECK_DEFAULT_ROW_QUANTITY;
        const descRaw = card.desc;
        if ((!row.cardDesc || !row.cardDesc.trim()) && typeof descRaw === 'string' && descRaw.trim()) {
            row.cardDesc = descRaw.trim();
        }
        return { ok: true, mode: 'increment' };
    }
    if (!canAddToDeckLimitGroup(allRowsFlat, limitKey, DECK_DEFAULT_ROW_QUANTITY, incomingMax))
        return { ok: false };

    arr.push(createDeckRowFromApiCard(card));
    return { ok: true, mode: 'newRow' };
}
