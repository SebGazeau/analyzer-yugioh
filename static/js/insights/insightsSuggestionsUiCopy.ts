/**
 * Libellés / `title` de l’onglet Suggestions (insights, Number Xyz, puces Main/Side).
 */

import { DECK_DEFAULT_ROW_QUANTITY } from '../deck-builder/deckConstants.js';

/** Caractère affiché dans la vignette vide d’une puce match (pas d’image). */
export const INSIGHTS_MAIN_MATCH_THUMB_PLACEHOLDER_TEXT = '?';

/** Libellé visible du bouton « Chercher » (ligne Number Xyz). */
export const INSIGHTS_FIND_CARD_BUTTON_LABEL = 'Chercher';

/** `title` des puces « match » (section affichée entre parenthèses). */
export function insightsMainMatchChipTitle(sectionShortLabel: string): string {
    return `Cliquer pour ajouter ${DECK_DEFAULT_ROW_QUANTITY} exemplaire (${sectionShortLabel})`;
}

/** `aria-label` de la quantité sur une puce match (qty &gt; {@link DECK_DEFAULT_ROW_QUANTITY}). */
export function insightsMainMatchQtyAriaLabel(quantity: number): string {
    return `${quantity} exemplaires`;
}

/** `title` d’une ligne suggestion Number Xyz. */
export const INSIGHTS_SUGGEST_ROW_TITLE = 'Cliquer pour ajouter cette carte au deck (Extra si Xyz)';

/** `title` du bouton « Chercher » (ouvre Builder + recherche). */
export const INSIGHTS_FIND_CARD_BUTTON_TITLE = 'Ouvrir le Builder et rechercher cette carte';

/** Séparateur entre attribut et race (colonne du tableau Number Xyz). */
export const INSIGHTS_NUMBER_SUGGESTION_ATTR_RACE_SEPARATOR = ' / ';
