/**
 * Visibilité des boutons « Sauvegarder » vs « Mettre à jour » selon un deck serveur chargé.
 */

import { STYLE_DISPLAY_DEFAULT, STYLE_DISPLAY_NONE } from '../utils/cssInlineDisplay.js';
import { DECK_BTN_SAVE_SERVER_ID, DECK_BTN_UPDATE_SERVER_ID } from './deckConstants.js';
import { getCurrentLoadedDeck } from './loadedDeckSession.js';

export function syncDeckSaveUpdateButtonsDom(): void {
    const saveBtn = document.getElementById(DECK_BTN_SAVE_SERVER_ID);
    const updateBtn = document.getElementById(DECK_BTN_UPDATE_SERVER_ID);
    const loaded = getCurrentLoadedDeck() !== null;
    if (saveBtn instanceof HTMLElement)
        saveBtn.style.display = loaded ? STYLE_DISPLAY_NONE : STYLE_DISPLAY_DEFAULT;
    if (updateBtn instanceof HTMLElement)
        updateBtn.style.display = loaded ? STYLE_DISPLAY_DEFAULT : STYLE_DISPLAY_NONE;
}
