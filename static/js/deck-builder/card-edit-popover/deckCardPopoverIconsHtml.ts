/**
 * Markup SVG interne des icônes du popover « Modifier la carte ».
 * Les classes CSS et sélecteurs restent dans `deckCardPopoverDomSelectors.ts`.
 */

/** Attributs communs des `<svg class="…popover-icon">` (traits UI). */
export const DECK_CARD_POPOVER_ICON_SVG_ATTRS =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** Path `d` — bouton fermer (croix). */
export const DECK_CARD_POPOVER_SVG_PATH_CLOSE_D = 'M18 6L6 18M6 6l12 12';

const DECK_CARD_POPOVER_SVG_DELETE_PATH_DS = [
    'M3 6h18',
    'M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2',
    'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
    'M10 11v6M14 11v6',
] as const;

/** Fragments `<path d="…"/>` empilés pour l’icône corbeille. */
export const DECK_CARD_POPOVER_SVG_DELETE_PATHS_HTML = DECK_CARD_POPOVER_SVG_DELETE_PATH_DS.map(
    (d) => `<path d="${d}"/>`,
).join('');

/** Rect + cercle + path pour l’icône couverture (galerie). */
export const DECK_CARD_POPOVER_SVG_COVER_INNER_HTML =
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 17l-4.5-4.5L9 20"/>';

/** Deux maillons — cartes associées / liens entre cartes. */
export const DECK_CARD_POPOVER_SVG_ASSOCIATED_PATHS_HTML =
    '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>';
