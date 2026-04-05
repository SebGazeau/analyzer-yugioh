/**
 * Textes annoncés dans la zone `aria-live` du modal associations.
 */

export const ASSOCIATIONS_LIVE_CANNOT_RESOLVE_CARD_NAME =
    'Impossible de résoudre le nom de cette carte.';

export function associationsLiveCardAddedToDeck(cardName: string): string {
    return `${cardName} ajouté au deck.`;
}

export const ASSOCIATIONS_LIVE_NOTHING_TO_COPY = 'Rien à copier.';

export const ASSOCIATIONS_LIVE_REPORT_COPIED = 'Rapport copié dans le presse-papiers.';

export const ASSOCIATIONS_LIVE_COPY_FAILED =
    'Copie impossible — vérifie les permissions du navigateur.';
