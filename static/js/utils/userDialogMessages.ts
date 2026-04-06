/**
 * Textes passés à `alert` / `confirm` (évite la duplication de chaînes utilisateur).
 */

import { escapeHtml } from './html.js';
import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from './textPlaceholders.js';

export const MSG_ADD_CARD_BLOCKED =
    "Impossible d'ajouter (limite d'exemplaires, zone pleine ou type incompatible).";

export function msgAssociationCardNotFound(searchName: string): string {
    return `Carte introuvable pour ${TEXT_GUILLEMET_OPEN} ${searchName} ${TEXT_GUILLEMET_CLOSE} (API /carte ou recherche).`;
}

export const MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT =
    'Carte introuvable ou nom trop court pour la recherche (minimum 4 caractères).';

export function msgErrorPrefixed(detail: string): string {
    return `Erreur: ${detail}`;
}

export function msgDeckDuplicated(deckName: string): string {
    return `Deck dupliqué : ${TEXT_GUILLEMET_OPEN} ${deckName} (copie) ${TEXT_GUILLEMET_CLOSE}`;
}

/** `deckName` brut : échappé pour affichage HTML dans la boîte de dialogue. */
export function msgConfirmDeleteDeck(deckName: string): string {
    return `Supprimer le deck ${TEXT_GUILLEMET_OPEN} ${escapeHtml(deckName)} ${TEXT_GUILLEMET_CLOSE} ?`;
}

export const MSG_DECK_DELETE_FAILED = 'Impossible de supprimer le deck.';
export const MSG_DECK_LOAD_FAILED = 'Impossible de charger le deck';

export function msgDeckSavedWithId(id: number): string {
    return `Deck enregistré (id: ${id})`;
}

export const MSG_DECK_UPDATED = 'Deck mis à jour.';

export const MSG_DECK_EXTRA_PLACEMENT_FORBIDDEN =
    "Cette carte ne peut pas être placée dans l'Extra Deck.";

export function msgDeckZoneFull(maxT: number): string {
    return `Zone pleine (max ${maxT} cartes).`;
}

export function msgImportCardsNotFound(failedCards: string[]): string {
    const n = failedCards.length;
    const head = failedCards.slice(0, 10).join('\n');
    const tail = n > 10 ? `\n... et ${n - 10} autre(s)` : '';
    return `${n} carte(s) non trouvée(s):\n${head}${tail}`;
}

export function msgImportParseError(message: string): string {
    return `Erreur à l'import : ${message}`;
}

/** Message d’erreur si le JSON deck n’a pas la forme attendue (levée puis capturée → alert). */
export const MSG_IMPORT_JSON_INVALID_FORMAT =
    'Format JSON invalide (attendu: { main, extra, side } ou tableau)';
