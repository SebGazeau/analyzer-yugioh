/**
 * Textes affichés dans une cellule carte (grille builder) — hors sélecteurs DOM.
 */

import { DECK_DEFAULT_ROW_QUANTITY } from '../deckConstants.js';

/** Caractère affiché quand la carte n’a pas d’image. */
export const DECK_CARD_THUMB_PLACEHOLDER_TEXT = '?';

/** Préfixe affiché devant la quantité (grille + popover, ex. « x3 »). */
export const DECK_CARD_QTY_DISPLAY_PREFIX = 'x';

/** Libellé `title` / `aria-label` du bouton retirer une unité de quantité (grille). */
export const DECK_CARD_REMOVE_ONE_BTN_LABEL = `Retirer ${DECK_DEFAULT_ROW_QUANTITY} exemplaire`;

/** Infobulle du badge banlist (TCG). */
export function deckCardBanBadgeTitle(maxCopies: number): string {
    return `Banlist TCG : max ${maxCopies} exemplaire(s)`;
}

/**
 * Libellé court du badge banlist (corps visible, pas le `title`).
 * « lt. » = limited (abréviation historique UI).
 */
export function deckCardBanBadgeVisibleLabel(maxCopies: number): string {
    return `lt. ${maxCopies}`;
}
