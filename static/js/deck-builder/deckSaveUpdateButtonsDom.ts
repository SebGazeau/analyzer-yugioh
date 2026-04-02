/**
 * Visibilité des boutons « Sauvegarder » vs « Mettre à jour » selon un deck serveur chargé.
 */

import { DECK_BTN_SAVE_SERVER_ID, DECK_BTN_UPDATE_SERVER_ID } from './deckConstants.js';
import { getCurrentLoadedDeck } from './loadedDeckSession.js';

export function syncDeckSaveUpdateButtonsDom(): void {
    const saveBtn = document.getElementById(DECK_BTN_SAVE_SERVER_ID);
    const updateBtn = document.getElementById(DECK_BTN_UPDATE_SERVER_ID);
    const loaded = getCurrentLoadedDeck() !== null;
    if (saveBtn instanceof HTMLElement) saveBtn.style.display = loaded ? 'none' : '';
    if (updateBtn instanceof HTMLElement) updateBtn.style.display = loaded ? '' : 'none';
}
