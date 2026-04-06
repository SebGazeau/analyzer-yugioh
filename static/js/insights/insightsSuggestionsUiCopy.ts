/**
 * Libellés / `title` de l’onglet Suggestions (insights, Number Xyz, puces Main/Side).
 */

/** Libellé visible du bouton « Chercher » (ligne Number Xyz). */
export const INSIGHTS_FIND_CARD_BUTTON_LABEL = 'Chercher';

/** `title` des puces « match » (section affichée entre parenthèses). */
export function insightsMainMatchChipTitle(sectionShortLabel: string): string {
    return `Cliquer pour ajouter 1 exemplaire (${sectionShortLabel})`;
}

/** `title` d’une ligne suggestion Number Xyz. */
export const INSIGHTS_SUGGEST_ROW_TITLE = 'Cliquer pour ajouter cette carte au deck (Extra si Xyz)';

/** `title` du bouton « Chercher » (ouvre Builder + recherche). */
export const INSIGHTS_FIND_CARD_BUTTON_TITLE = 'Ouvrir le Builder et rechercher cette carte';
