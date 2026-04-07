/**
 * Résolution des entrées deck serveur → lignes {@link DeckRow} (fetch par nom).
 */

import type { Card } from '../api.js';
import type { DeckRow } from '../deck.js';
import { createDeckRowFromServerEntry, type ServerDeckListEntry } from './deckRowFactory.js';

export function parseUnknownAsServerDeckListEntries(v: unknown): ServerDeckListEntry[] {
    return Array.isArray(v) ? (v as ServerDeckListEntry[]) : [];
}

export async function resolveServerDeckListEntriesToRows(
    entries: ServerDeckListEntry[],
    fetchCardByName: (name: string) => Promise<Card | null>,
): Promise<DeckRow[]> {
    const rows: DeckRow[] = [];
    for (const entry of entries) {
        const infoCard = await fetchCardByName(entry.name);
        if (!infoCard) continue;
        rows.push(createDeckRowFromServerEntry(infoCard, entry));
    }
    return rows;
}
