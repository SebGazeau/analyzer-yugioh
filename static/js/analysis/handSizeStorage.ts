/** Persistance localStorage de la taille de main (5 / 6). */

import {
    YGO_FIRST_HAND_DRAW_COUNT,
    YGO_SECOND_HAND_DRAW_COUNT,
    type YgoHandDrawCount,
} from './yugiohDrawConstants.js';

export const HAND_SIZE_STORAGE_KEY = 'yugioh-deck-hand-size';

export function readHandSizeFromStorage(): YgoHandDrawCount {
    try {
        const v = localStorage.getItem(HAND_SIZE_STORAGE_KEY);
        if (v === String(YGO_SECOND_HAND_DRAW_COUNT)) return YGO_SECOND_HAND_DRAW_COUNT;
        if (v === String(YGO_FIRST_HAND_DRAW_COUNT)) return YGO_FIRST_HAND_DRAW_COUNT;
    } catch (_) {}
    return YGO_FIRST_HAND_DRAW_COUNT;
}

export function writeHandSizeToStorage(size: YgoHandDrawCount): void {
    try {
        localStorage.setItem(HAND_SIZE_STORAGE_KEY, String(size));
    } catch (_) {}
}
