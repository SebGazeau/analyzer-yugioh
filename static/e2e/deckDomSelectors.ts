/**
 * Sélecteurs CSS alignés sur {@link DECK_GRID_IDS} (évite les chaînes dupliquées avec les specs Playwright).
 */
import { DECK_GRID_IDS } from '../js/deck-builder/deckConstants.js';

const hash = (id: string) => `#${id}`;

export const E2E_DECK_GRID = {
    main: hash(DECK_GRID_IDS.main),
    extra: hash(DECK_GRID_IDS.extra),
    side: hash(DECK_GRID_IDS.side),
} as const;
