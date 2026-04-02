/** Persistance localStorage de la taille de main (5 / 6). */

export const HAND_SIZE_STORAGE_KEY = 'yugioh-deck-hand-size';

export function readHandSizeFromStorage(): 5 | 6 {
    try {
        const v = localStorage.getItem(HAND_SIZE_STORAGE_KEY);
        if (v === '6') return 6;
        if (v === '5') return 5;
    } catch (_) {}
    return 5;
}

export function writeHandSizeToStorage(size: 5 | 6): void {
    try {
        localStorage.setItem(HAND_SIZE_STORAGE_KEY, String(size));
    } catch (_) {}
}
