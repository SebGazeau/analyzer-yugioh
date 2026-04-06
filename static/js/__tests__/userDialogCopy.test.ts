import { describe, it, expect } from 'vitest';
import {
    copyAssociationCardNotFoundMessage,
    copyConfirmDeleteDeckMessage,
    copyDeckDuplicatedMessage,
    copyDeckZoneFullMessage,
    copyErrorPrefixedMessage,
    copyImportCardsNotFoundMessage,
    DECK_DUPLICATE_NAME_SUFFIX,
    DECK_EXPORT_JSON_FILE_NAME,
    DECK_NAME_FALLBACK_DISPLAY,
    MSG_DECK_API_AUTH_REQUIRED,
    MSG_DECK_API_DECK_NOT_FOUND,
    MSG_IMPORT_JSON_INVALID_FORMAT,
    MSG_PROMPT_DECK_NAME,
    MSG_UPDATE_DECK_NOT_LOADED,
} from '../utils/userDialogCopy.js';
import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from '../utils/textPlaceholders.js';

describe('userDialogCopy', () => {
    it('copyAssociationCardNotFoundMessage', () => {
        const m = copyAssociationCardNotFoundMessage('Dark Magician');
        expect(m).toContain('Dark Magician');
        expect(m).toContain('/carte');
        expect(m).toContain(TEXT_GUILLEMET_OPEN);
        expect(m).toContain(TEXT_GUILLEMET_CLOSE);
    });

    it('copyErrorPrefixedMessage', () => {
        expect(copyErrorPrefixedMessage('timeout')).toBe('Erreur: timeout');
    });

    it('DECK_DUPLICATE_NAME_SUFFIX + copyDeckDuplicatedMessage', () => {
        expect(DECK_DUPLICATE_NAME_SUFFIX).toBe(' (copie)');
        expect(copyDeckDuplicatedMessage('X')).toContain(DECK_DUPLICATE_NAME_SUFFIX);
        expect(copyDeckDuplicatedMessage('X')).toContain('X');
    });

    it('copyConfirmDeleteDeckMessage attend du HTML déjà échappé', () => {
        expect(copyConfirmDeleteDeckMessage('&lt;script&gt;')).toContain('&lt;script&gt;');
    });

    it('copyDeckZoneFullMessage', () => {
        expect(copyDeckZoneFullMessage(15)).toContain('15');
    });

    it('constantes deck / import', () => {
        expect(MSG_IMPORT_JSON_INVALID_FORMAT).toContain('main');
        expect(MSG_PROMPT_DECK_NAME).toContain('deck');
        expect(MSG_UPDATE_DECK_NOT_LOADED.length).toBeGreaterThan(20);
        expect(DECK_NAME_FALLBACK_DISPLAY).toBe('Sans nom');
        expect(DECK_EXPORT_JSON_FILE_NAME).toBe('deck.json');
        expect(MSG_DECK_API_AUTH_REQUIRED).toContain('Connexion');
        expect(MSG_DECK_API_DECK_NOT_FOUND).toBe('Deck introuvable');
    });

    it('copyImportCardsNotFoundMessage', () => {
        const a = copyImportCardsNotFoundMessage(['A', 'B']);
        expect(a).toContain('2 carte');
        expect(a).toContain('A');
        expect(a).toContain('B');
        const many = copyImportCardsNotFoundMessage(Array.from({ length: 12 }, (_, i) => `c${i}`));
        expect(many).toContain('... et 2 autre');
    });
});
