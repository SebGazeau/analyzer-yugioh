/**
 * Constantes du deck builder : IDs DOM, clés stockage, fetch, DnD, layout popover.
 */

import { DECK_SECTIONS, type DeckSection } from '../deckSection.js';

/** IDs des conteneurs grille (alignés sur le template builder). */
export const DECK_GRID_IDS: Record<DeckSection, string> = {
    main: 'deck-main-grid',
    extra: 'deck-extra-grid',
    side: 'deck-side-grid',
};

/** Même ordre que {@link DECK_SECTIONS} (pour boucles DOM). */
export const DECK_GRID_DOM_IDS: readonly string[] = DECK_SECTIONS.map((s) => DECK_GRID_IDS[s]);

/** Résout l’`id` d’un conteneur grille (ex. `deck-main-grid`) vers la zone deck. */
export function deckSectionForGridElementId(
    elementId: string,
    gridIds: Record<DeckSection, string>,
): DeckSection | null {
    for (const s of DECK_SECTIONS) {
        if (gridIds[s] === elementId) return s;
    }
    return null;
}

/** Préfixe localStorage pour la carte de couverture par deck (`${key}-${deckId}`). */
export const DECK_COVER_STORAGE_KEY = 'yugioh-deck-cover';

export const DECK_NAME_INPUT_ID = 'deck-name-input';

export const DECK_BTN_SAVE_SERVER_ID = 'btn-save-server';
export const DECK_BTN_UPDATE_SERVER_ID = 'btn-update-server';

/** Espacement popover ↔ ancre (px). */
export const DECK_CARD_POPOVER_GAP_PX = 4;

/** Marge minimale au bord du viewport lors du positionnement du popover (px). */
export const DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX = 16;

/** Options communes aux requêtes deck (cookies de session). */
export const DECK_FETCH_INIT: RequestInit = { credentials: 'same-origin' };

/** Type MIME du payload drag-and-drop entre cellules du deck. */
export const DECK_DND_PAYLOAD_TYPE = 'application/x-yugioh-deck-cell';
