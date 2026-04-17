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
    MSG_SESSION_RESYNC_AFTER_UNAUTHORIZED,
    MSG_IMPORT_JSON_INVALID_FORMAT,
    MSG_PROMPT_DECK_NAME,
    MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT,
    MSG_UPDATE_DECK_NOT_LOADED,
    USER_DIALOG_ERROR_PREFIX,
    USER_DIALOG_IMPORT_FAILED_NAMES_PREVIEW_MAX,
} from '../utils/userDialogCopy.js';
import { SEARCH_MIN_QUERY_LENGTH } from '../searchConstants.js';
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
        expect(USER_DIALOG_ERROR_PREFIX).toBe('Erreur:');
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

    it('MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT aligné sur SEARCH_MIN_QUERY_LENGTH', () => {
        expect(MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT).toContain(String(SEARCH_MIN_QUERY_LENGTH));
        expect(MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT).toContain('caractères');
    });

    it('constantes deck / import', () => {
        expect(MSG_IMPORT_JSON_INVALID_FORMAT).toContain('main');
        expect(MSG_PROMPT_DECK_NAME).toContain('deck');
        expect(MSG_UPDATE_DECK_NOT_LOADED.length).toBeGreaterThan(20);
        expect(DECK_NAME_FALLBACK_DISPLAY).toBe('Sans nom');
        expect(DECK_EXPORT_JSON_FILE_NAME).toBe('deck.json');
        expect(MSG_DECK_API_AUTH_REQUIRED).toContain('Connexion');
        expect(MSG_DECK_API_DECK_NOT_FOUND).toBe('Deck introuvable');
        expect(MSG_SESSION_RESYNC_AFTER_UNAUTHORIZED).toContain('session');
        expect(MSG_SESSION_RESYNC_AFTER_UNAUTHORIZED).toContain('actualisée');
    });

    it('copyImportCardsNotFoundMessage', () => {
        expect(USER_DIALOG_IMPORT_FAILED_NAMES_PREVIEW_MAX).toBe(10);
        const a = copyImportCardsNotFoundMessage(['A', 'B']);
        expect(a).toContain('2 carte');
        expect(a).toContain('A');
        expect(a).toContain('B');
        const over = USER_DIALOG_IMPORT_FAILED_NAMES_PREVIEW_MAX + 2;
        const many = copyImportCardsNotFoundMessage(Array.from({ length: over }, (_, i) => `c${i}`));
        expect(many).toContain(`... et 2 autre`);
    });
});
