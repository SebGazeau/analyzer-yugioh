/**
 * Constantes du deck builder : IDs DOM, clés stockage, fetch, DnD, layout popover.
 */

import { DECK_SECTIONS, mapDeckSections, type DeckSection } from '../deckSection.js';

/** IDs des conteneurs grille (`deck-{section}-grid`, alignés sur le template builder). */
export const DECK_GRID_IDS: Record<DeckSection, string> = mapDeckSections((s) => `deck-${s}-grid`);

/** Même ordre que {@link DECK_SECTIONS} (pour boucles DOM). */
export const DECK_GRID_DOM_IDS: readonly string[] = DECK_SECTIONS.map((s) => DECK_GRID_IDS[s]);

/** Résout l’`id` d’un conteneur grille (ex. `deck-main-grid`) vers la zone deck. */
export function deckSectionForGridElementId(
    elementId: string,
    gridIds: Record<DeckSection, string>,
): DeckSection | null {
    return DECK_SECTIONS.find((s) => gridIds[s] === elementId) ?? null;
}

/** Préfixe localStorage pour la carte de couverture par deck (`${key}-${deckId}`). */
export const DECK_COVER_STORAGE_KEY = 'yugioh-deck-cover';

export const DECK_NAME_INPUT_ID = 'deck-name-input';

export const DECK_BTN_SAVE_SERVER_ID = 'btn-save-server';
export const DECK_BTN_UPDATE_SERVER_ID = 'btn-update-server';

export const DECK_MY_DECKS_LIST_ID = 'my-decks-list';
export const DECK_MY_DECKS_EMPTY_ID = 'my-decks-empty';
export const DECK_BTN_REFRESH_DECKS_ID = 'btn-refresh-decks';

export const DECK_IMPORT_JSON_INPUT_ID = 'import-json';
export const DECK_BTN_CLEAR_DECK_ID = 'btn-clear-deck';
export const DECK_BTN_EXPORT_JSON_ID = 'btn-export-json';
export const DECK_BTN_IMPORT_JSON_TRIGGER_ID = 'btn-import-json-trigger';

/** Espacement popover ↔ ancre (px). */
export const DECK_CARD_POPOVER_GAP_PX = 4;

/** Marge minimale au bord du viewport lors du positionnement du popover (px). */
export const DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX = 16;

/** Options communes aux requêtes deck (cookies de session). */
export const DECK_FETCH_INIT: RequestInit = { credentials: 'same-origin' };

/** Type MIME du payload drag-and-drop entre cellules du deck. */
export const DECK_DND_PAYLOAD_TYPE = 'application/x-yugioh-deck-cell';
