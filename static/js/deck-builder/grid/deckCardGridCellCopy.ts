/**
 * Textes affichés dans une cellule carte (grille builder) — hors sélecteurs DOM.
 */

/** Caractère affiché quand la carte n’a pas d’image. */
export const DECK_CARD_THUMB_PLACEHOLDER_TEXT = '?';

/**
 * Libellé court du badge banlist (corps visible, pas le `title`).
 * « lt. » = limited (abréviation historique UI).
 */
export function deckCardBanBadgeVisibleLabel(maxCopies: number): string {
    return `lt. ${maxCopies}`;
}
