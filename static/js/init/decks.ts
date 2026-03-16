/**
 * Init interface Decks (data-page="decks") : liste Mes decks, rafraîchir, charger.
 * Pour matrice de droits : désactiver ou masquer [data-page="decks"] + ne pas appeler initDecks().
 */
import { bindDeckList } from './deck-actions.js';

export function initDecks(): void {
    bindDeckList();
}
