/**
 * Couverture de deck (localStorage par id).
 */

import { DECK_COVER_STORAGE_KEY } from './deckConstants.js';
import { dispatchDeckCoverChanged } from './deckCoverEvents.js';

export interface StoredDeckCover {
    imageUrl: string;
    name: string;
}

export function getDeckCover(deckId: number): StoredDeckCover | null {
    try {
        const raw = localStorage.getItem(`${DECK_COVER_STORAGE_KEY}-${deckId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { imageUrl?: string; name?: string };
        if (parsed && typeof parsed.name === 'string') {
            return { imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : '', name: parsed.name };
        }
    } catch (_) {}
    return null;
}

export function setDeckCover(deckId: number, imageUrl: string, name: string): void {
    try {
        localStorage.setItem(`${DECK_COVER_STORAGE_KEY}-${deckId}`, JSON.stringify({ imageUrl, name }));
        dispatchDeckCoverChanged(deckId);
    } catch (_) {}
}

export function removeDeckCoverFromStorage(deckId: number): void {
    try {
        localStorage.removeItem(`${DECK_COVER_STORAGE_KEY}-${deckId}`);
    } catch (_) {}
}
