/**
 * Champ nom du deck dans le builder.
 */

import { DECK_NAME_INPUT_ID } from './deckConstants.js';

export function readDeckNameFromBuilderInput(): string {
    const el = document.getElementById(DECK_NAME_INPUT_ID) as HTMLInputElement | null;
    return el?.value?.trim() ?? '';
}

export function writeDeckNameToBuilderInput(name: string): void {
    const el = document.getElementById(DECK_NAME_INPUT_ID) as HTMLInputElement | null;
    if (el) el.value = name;
}
