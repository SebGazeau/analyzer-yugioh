/**
 * DOM léger : en-tête Analysis, hack global pour outils « taille de main ».
 */

const WINDOW_DECK_TOTAL_KEY = '__deckTotalForHandSize';

/** Titre « Nom du deck — » dans l’onglet Analysis. */
export function setAnalysisDeckName(name: string): void {
    const el = document.getElementById('analysis-deck-name');
    if (!el) return;
    const text = name.trim();
    el.textContent = text ? `${text} — ` : '';
}

/** Expose le nombre de cartes Main pour d’éventuels scripts (clé historique). */
export function publishMainDeckTotalForHandSizeTools(main: ReadonlyArray<{ quantity: number }>): void {
    const totalCards = main.reduce((sum, r) => sum + r.quantity, 0);
    if (totalCards === 0) return;
    (window as unknown as Record<string, unknown>)[WINDOW_DECK_TOTAL_KEY] = totalCards;
}
