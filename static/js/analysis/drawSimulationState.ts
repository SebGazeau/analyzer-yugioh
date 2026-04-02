/**
 * État mutable : taille de main (5/6) et pile de noms tirés (simulation).
 */

import { readHandSizeFromStorage, writeHandSizeToStorage } from './handSizeStorage.js';

let handSize: 5 | 6 = readHandSizeFromStorage();
const drawnCardNames: string[] = [];

export function getHandSize(): 5 | 6 {
    return handSize;
}

/** @returns `true` si la valeur a réellement changé. */
export function applyHandSize(size: 5 | 6): boolean {
    if (handSize === size) return false;
    handSize = size;
    writeHandSizeToStorage(size);
    return true;
}

export function getDrawnCardNamesCopy(): string[] {
    return [...drawnCardNames];
}

export function clearDrawnCardNames(): void {
    drawnCardNames.length = 0;
}

export function pushDrawnCardName(name: string): void {
    drawnCardNames.push(name);
}

/** Pour affichage / comptage sans copie (usage interne au module stats). */
export function getDrawnCardNamesReadonly(): readonly string[] {
    return drawnCardNames;
}
