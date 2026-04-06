/**
 * DOM léger : en-tête Analysis, hack global pour outils « taille de main ».
 */

import { analysisDeckNameHeaderText } from './analysisDeckNameTitleCopy.js';
import { ANALYSIS_DECK_NAME_ELEMENT_ID } from './analysisDomIds.js';

const WINDOW_DECK_TOTAL_KEY = '__deckTotalForHandSize';

/** Titre « Nom du deck — » dans l’onglet Analysis. */
export function setAnalysisDeckName(name: string): void {
    const el = document.getElementById(ANALYSIS_DECK_NAME_ELEMENT_ID);
    if (!el) return;
    el.textContent = analysisDeckNameHeaderText(name);
}

/** Expose le nombre de cartes Main pour d’éventuels scripts (clé historique). */
export function publishMainDeckTotalForHandSizeTools(main: ReadonlyArray<{ quantity: number }>): void {
    const totalCards = main.reduce((sum, r) => sum + r.quantity, 0);
    if (totalCards === 0) return;
    (window as unknown as Record<string, unknown>)[WINDOW_DECK_TOTAL_KEY] = totalCards;
}
