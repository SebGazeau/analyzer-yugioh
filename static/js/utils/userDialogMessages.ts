/**
 * Textes passés à `alert` / `confirm` (facade : échappement + réexport copy).
 */

import { escapeHtml } from './html.js';
import {
    copyAssociationCardNotFoundMessage,
    copyConfirmDeleteDeckMessage,
    copyDeckDuplicatedMessage,
    copyDeckSavedWithIdMessage,
    copyDeckZoneFullMessage,
    copyErrorPrefixedMessage,
    copyImportCardsNotFoundMessage,
    copyImportParseErrorMessage,
    DECK_DUPLICATE_NAME_SUFFIX,
    DECK_EXPORT_JSON_FILE_NAME,
    DECK_NAME_FALLBACK_DISPLAY,
    MSG_ADD_CARD_BLOCKED,
    MSG_DECK_API_AUTH_REQUIRED,
    MSG_DECK_API_DECK_NOT_FOUND,
    MSG_DECK_DELETE_FAILED,
    MSG_DECK_EXTRA_PLACEMENT_FORBIDDEN,
    MSG_DECK_LOAD_FAILED,
    MSG_DECK_UPDATED,
    MSG_IMPORT_JSON_INVALID_FORMAT,
    MSG_PROMPT_DECK_NAME,
    MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT,
    MSG_UPDATE_DECK_NOT_LOADED,
    USER_DIALOG_ERROR_PREFIX,
} from './userDialogCopy.js';

export {
    DECK_DUPLICATE_NAME_SUFFIX,
    DECK_EXPORT_JSON_FILE_NAME,
    DECK_NAME_FALLBACK_DISPLAY,
    MSG_ADD_CARD_BLOCKED,
    MSG_DECK_API_AUTH_REQUIRED,
    MSG_DECK_API_DECK_NOT_FOUND,
    MSG_DECK_DELETE_FAILED,
    MSG_DECK_EXTRA_PLACEMENT_FORBIDDEN,
    MSG_DECK_LOAD_FAILED,
    MSG_DECK_UPDATED,
    MSG_IMPORT_JSON_INVALID_FORMAT,
    MSG_PROMPT_DECK_NAME,
    MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT,
    MSG_UPDATE_DECK_NOT_LOADED,
    USER_DIALOG_ERROR_PREFIX,
};

export function msgAssociationCardNotFound(searchName: string): string {
    return copyAssociationCardNotFoundMessage(searchName);
}

export function msgErrorPrefixed(detail: string): string {
    return copyErrorPrefixedMessage(detail);
}

export function msgDeckDuplicated(sourceDeckName: string): string {
    return copyDeckDuplicatedMessage(sourceDeckName);
}

/** `deckName` brut : échappé pour affichage HTML dans la boîte de dialogue. */
export function msgConfirmDeleteDeck(deckName: string): string {
    return copyConfirmDeleteDeckMessage(escapeHtml(deckName));
}

export function msgDeckSavedWithId(id: number): string {
    return copyDeckSavedWithIdMessage(id);
}

export function msgDeckZoneFull(maxT: number): string {
    return copyDeckZoneFullMessage(maxT);
}

export function msgImportCardsNotFound(failedCards: string[]): string {
    return copyImportCardsNotFoundMessage(failedCards);
}

export function msgImportParseError(message: string): string {
    return copyImportParseErrorMessage(message);
}
