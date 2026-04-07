import { describe, expect, it } from 'vitest';
import {
    DECK_SAVED_ITEM_DELETE_BTN_TITLE,
    DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE,
    deckSavedListItemLoadTitle,
} from '../deck-builder/deckSavedListTitlesCopy.js';
import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from '../utils/textPlaceholders.js';

describe('deckSavedListTitlesCopy', () => {
    it('titres boutons dupliquer / supprimer liste Mes decks', () => {
        expect(DECK_SAVED_ITEM_DUPLICATE_BTN_TITLE).toContain('Dupliquer');
        expect(DECK_SAVED_ITEM_DELETE_BTN_TITLE).toContain('Supprimer');
    });

    it('title ligne charger deck échappe le nom', () => {
        expect(deckSavedListItemLoadTitle('Test')).toContain('Test');
        expect(deckSavedListItemLoadTitle('Test')).toContain(TEXT_GUILLEMET_OPEN);
        expect(deckSavedListItemLoadTitle('Test')).toContain(TEXT_GUILLEMET_CLOSE);
        expect(deckSavedListItemLoadTitle('<')).not.toContain('<');
    });
});
