/**
 * Titres / infobulles de la liste « Mes decks » (charger, dupliquer, supprimer).
 */

import { escapeHtml } from '../utils/html.js';
import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from '../utils/textPlaceholders.js';

export const DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE = 'Dupliquer le deck';
export const DECK_SAVED_ITEM_DELETE_BTN_TITLE = 'Supprimer le deck';

/** `title` de la ligne cliquable pour charger un deck (nom échappé). */
export function deckSavedListItemLoadTitle(deckName: string): string {
    return `Charger le deck ${TEXT_GUILLEMET_OPEN} ${escapeHtml(deckName)} ${TEXT_GUILLEMET_CLOSE}`;
}
