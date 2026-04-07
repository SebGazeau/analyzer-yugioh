/**
 * État mutable : taille de main (5/6) et pile de noms tirés (simulation).
 */

import { readHandSizeFromStorage, writeHandSizeToStorage } from './handSizeStorage.js';
import type { YgoHandDrawCount } from './yugiohDrawConstants.js';

let handSize: YgoHandDrawCount = readHandSizeFromStorage();
const drawnCardNames: string[] = [];

export function getHandSize(): YgoHandDrawCount {
    return handSize;
}

/** @returns `true` si la valeur a réellement changé. */
export function applyHandSize(size: YgoHandDrawCount): boolean {
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
