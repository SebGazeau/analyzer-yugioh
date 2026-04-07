import { describe, expect, it } from 'vitest';
import {
    DECK_SAVED_LIST_DATE_FORMAT_OPTIONS,
    DECK_SAVED_LIST_DATE_LOCALE,
} from '../utils/deckListDateFormat.js';

describe('deckListDateFormat', () => {
    it('locale fr-FR pour cohérence liste decks', () => {
        expect(DECK_SAVED_LIST_DATE_LOCALE).toBe('fr-FR');
    });

    it('options jour / mois court / année', () => {
        expect(DECK_SAVED_LIST_DATE_FORMAT_OPTIONS.day).toBe('2-digit');
        expect(DECK_SAVED_LIST_DATE_FORMAT_OPTIONS.month).toBe('short');
        expect(DECK_SAVED_LIST_DATE_FORMAT_OPTIONS.year).toBe('numeric');
    });
});
