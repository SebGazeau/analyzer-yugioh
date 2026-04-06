/**
 * Chaînes et gabarits pour alert / confirm / prompt (copy centralisé).
 */

import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from './textPlaceholders.js';

export const MSG_ADD_CARD_BLOCKED =
    "Impossible d'ajouter (limite d'exemplaires, zone pleine ou type incompatible).";

export const MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT =
    'Carte introuvable ou nom trop court pour la recherche (minimum 4 caractères).';

export const DECK_DUPLICATE_NAME_SUFFIX = ' (copie)';

export const MSG_DECK_DELETE_FAILED = 'Impossible de supprimer le deck.';
export const MSG_DECK_LOAD_FAILED = 'Impossible de charger le deck';

export const MSG_DECK_UPDATED = 'Deck mis à jour.';

export const MSG_PROMPT_DECK_NAME = 'Nom du deck ?';

export const MSG_UPDATE_DECK_NOT_LOADED =
    'Aucun deck chargé. Chargez un deck ou sauvegardez-en un nouveau.';

export const DECK_NAME_FALLBACK_DISPLAY = 'Sans nom';

export const DECK_EXPORT_JSON_FILE_NAME = 'deck.json';

export const MSG_DECK_API_AUTH_REQUIRED =
    'Connexion requise. Connectez-vous pour enregistrer ou gérer vos decks.';

export const MSG_DECK_API_DECK_NOT_FOUND = 'Deck introuvable';

export const MSG_DECK_EXTRA_PLACEMENT_FORBIDDEN =
    "Cette carte ne peut pas être placée dans l'Extra Deck.";

export const MSG_IMPORT_JSON_INVALID_FORMAT =
    'Format JSON invalide (attendu: { main, extra, side } ou tableau)';

export function copyAssociationCardNotFoundMessage(searchName: string): string {
    return `Carte introuvable pour ${TEXT_GUILLEMET_OPEN} ${searchName} ${TEXT_GUILLEMET_CLOSE} (API /carte ou recherche).`;
}

/** Préfixe des alertes `msgErrorPrefixed` (suivi d’un espace puis le détail). */
export const USER_DIALOG_ERROR_PREFIX = 'Erreur:';

export function copyErrorPrefixedMessage(detail: string): string {
    return `${USER_DIALOG_ERROR_PREFIX} ${detail}`;
}

export function copyDeckDuplicatedMessage(sourceDeckName: string): string {
    return `Deck dupliqué : ${TEXT_GUILLEMET_OPEN} ${sourceDeckName}${DECK_DUPLICATE_NAME_SUFFIX} ${TEXT_GUILLEMET_CLOSE}`;
}

/** `deckName` déjà échappé pour HTML (ex. via `escapeHtml`). */
export function copyConfirmDeleteDeckMessage(deckNameEscaped: string): string {
    return `Supprimer le deck ${TEXT_GUILLEMET_OPEN} ${deckNameEscaped} ${TEXT_GUILLEMET_CLOSE} ?`;
}

export function copyDeckSavedWithIdMessage(id: number): string {
    return `Deck enregistré (id: ${id})`;
}

export function copyDeckZoneFullMessage(maxT: number): string {
    return `Zone pleine (max ${maxT} cartes).`;
}

export function copyImportCardsNotFoundMessage(failedCards: string[]): string {
    const n = failedCards.length;
    const head = failedCards.slice(0, 10).join('\n');
    const tail = n > 10 ? `\n... et ${n - 10} autre(s)` : '';
    return `${n} carte(s) non trouvée(s):\n${head}${tail}`;
}

export function copyImportParseErrorMessage(message: string): string {
    return `Erreur à l'import : ${message}`;
}
