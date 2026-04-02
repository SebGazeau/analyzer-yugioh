/**
 * Deck actuellement chargé depuis le serveur (id + nom) — état module.
 */

export interface LoadedDeckRecord {
    id: number;
    name: string;
}

let currentLoadedDeck: LoadedDeckRecord | null = null;

export function getCurrentLoadedDeck(): LoadedDeckRecord | null {
    return currentLoadedDeck;
}

export function setLoadedDeckRecord(id: number, name: string): void {
    currentLoadedDeck = { id, name };
}

export function clearLoadedDeckRecord(): void {
    currentLoadedDeck = null;
}
