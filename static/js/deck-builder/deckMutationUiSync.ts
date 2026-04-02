/**
 * Rafraîchissements stats / compteurs après mutation du deck (évite de dupliquer les séquences).
 */

export interface DeckMutationUiSync {
    /** Compteurs grille + probas + composition + tableau catégories. */
    refreshAllDeckPanels: () => void;
    /** Compteurs + probas + composition (ex. ajout carte — pas de refresh catégories). */
    refreshCountsProbabilitiesAndComposition: () => void;
    /** Compteurs + composition (ex. tri Main, table vidée). */
    refreshCountsAndComposition: () => void;
    /** Compteurs + composition + catégories (import JSON). */
    refreshAfterFileImport: () => void;
}

export function createDeckMutationUiSync(handlers: {
    updateDeckCount: () => void;
    updateProbabilities: () => void;
    computeGlobalStats: () => void;
    updateCategorySummary: () => void;
}): DeckMutationUiSync {
    const { updateDeckCount, updateProbabilities, computeGlobalStats, updateCategorySummary } = handlers;
    return {
        refreshAllDeckPanels: () => {
            updateDeckCount();
            updateProbabilities();
            computeGlobalStats();
            updateCategorySummary();
        },
        refreshCountsProbabilitiesAndComposition: () => {
            updateDeckCount();
            updateProbabilities();
            computeGlobalStats();
        },
        refreshCountsAndComposition: () => {
            updateDeckCount();
            computeGlobalStats();
        },
        refreshAfterFileImport: () => {
            updateDeckCount();
            computeGlobalStats();
            updateCategorySummary();
        },
    };
}
