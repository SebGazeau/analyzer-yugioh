/**
 * Construction de lignes {@link DeckRow} depuis l’API carte ou une entrée deck serveur.
 */

import type { Card } from '../api.js';
import type { DeckRow } from '../deck.js';
import { banTcgToMaxCopies } from './deckLimitGroups.js';

export interface ServerDeckListEntry {
    name: string;
    quantity?: number;
    id?: number;
    deck_copy_id?: number;
    engine?: string;
    categories?: string[];
}

/** Nouvelle ligne (qty 1) à partir d’une carte issue de la recherche / API. */
export function createDeckRowFromApiCard(card: Card): DeckRow {
    const displayName = card.name_en ?? card.name;
    const cardId = typeof card.id === 'number' && card.id > 0 ? card.id : undefined;
    const incomingMax = banTcgToMaxCopies(typeof card.ban_tcg === 'string' ? card.ban_tcg : undefined);
    const apiDc = (card as { deck_copy_id?: unknown }).deck_copy_id;
    const deckCopyId =
        typeof apiDc === 'number' && apiDc > 0
            ? apiDc
            : typeof cardId === 'number'
              ? cardId
              : undefined;

    return {
        name: displayName,
        type: card.type ?? '',
        quantity: 1,
        engine: '',
        categories: [],
        imageUrl: card.image_url ?? undefined,
        attribute: typeof card.attribute === 'string' ? card.attribute : undefined,
        level: typeof card.level === 'number' ? card.level : undefined,
        race: typeof card.race === 'string' ? card.race : undefined,
        frame_type: typeof card.frame_type === 'string' ? card.frame_type : undefined,
        maxCopies: incomingMax,
        cardId,
        deckCopyId,
    };
}

/** Ligne après résolution `fetchCardByName` + métadonnées serveur (load deck). */
export function createDeckRowFromServerEntry(infoCard: Card, entry: ServerDeckListEntry): DeckRow {
    const cid =
        typeof entry.id === 'number' && entry.id > 0
            ? entry.id
            : typeof infoCard.id === 'number'
              ? infoCard.id
              : undefined;
    const fromServer = entry.deck_copy_id;
    const deckCopyId =
        typeof fromServer === 'number' && fromServer > 0
            ? fromServer
            : typeof cid === 'number'
              ? cid
              : undefined;

    return {
        name: infoCard.name_en ?? infoCard.name,
        type: infoCard.type ?? '',
        quantity: entry.quantity ?? 1,
        engine: entry.engine ?? '',
        categories: entry.categories ?? [],
        imageUrl: infoCard.image_url ?? undefined,
        attribute: typeof infoCard.attribute === 'string' ? infoCard.attribute : undefined,
        level: typeof infoCard.level === 'number' ? infoCard.level : undefined,
        race: typeof infoCard.race === 'string' ? infoCard.race : undefined,
        frame_type: typeof infoCard.frame_type === 'string' ? infoCard.frame_type : undefined,
        maxCopies: banTcgToMaxCopies(typeof infoCard.ban_tcg === 'string' ? infoCard.ban_tcg : undefined),
        cardId: cid,
        deckCopyId,
    };
}
