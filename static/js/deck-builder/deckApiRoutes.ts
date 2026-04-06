/**
 * Chemins HTTP relatifs pour l’API decks (alignés sur les routes serveur).
 */

export const DECK_API_COLLECTION_URL = '/decks';

export function deckApiDeckByIdUrl(id: number): string {
    return `${DECK_API_COLLECTION_URL}/${id}`;
}
