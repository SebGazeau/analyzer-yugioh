// Statistiques et probabilités pour le deck — façade (état tirage + handSize, réexports).
import { refreshDeckInsightsPanel } from './insights/panel.js';
import { getDeckState } from './deck.js';
import { publishMainDeckTotalForHandSizeTools } from './analysis/analysisPageDom.js';
import {
    applyBuilderMainTypeCountsAndBars,
    applyCompositionDetailPanelsHtml,
    applyDeckSectionCountLabels,
} from './analysis/builderStatsDom.js';
import {
    buildCompositionDetailPanelsHtml,
    computeCompositionBreakdown,
} from './analysis/compositionBreakdown.js';
import { cleanDeckCardDisplayName, countNameOccurrences } from './analysis/categorySummaryData.js';
import { buildAnalysisCategorySummaryDomInput } from './analysis/categorySummaryOrchestrator.js';
import { renderAnalysisCategorySummaryDom } from './analysis/categorySummaryDom.js';
import { countCardsInDeckSection } from './analysis/deckSectionQuantity.js';
import { buildMainDeckProbabilitySnapshot } from './analysis/deckMainSnapshot.js';
import { runHistogramSimulation1000 } from './analysis/drawHistogramDom.js';
import { refreshDrawSimulationPanel } from './analysis/drawSimulationDom.js';
import { buildRemainingDrawPool, pickRandomFromPool } from './analysis/drawSimulationPile.js';
import { readHandSizeFromStorage, writeHandSizeToStorage } from './analysis/handSizeStorage.js';
import { computeMainDeckTypeCounts } from './analysis/mainDeckTypeCounts.js';

export type { CompositionBreakdown } from './analysis/compositionBreakdown.js';
export type { ProbabilityCardEntry } from './analysis/probabilityMath.js';
export { setAnalysisDeckName } from './analysis/analysisPageDom.js';
export {
    hypergeometricDist,
    hypergeometric,
    cumulativeHypergeometric,
    hypergeometricProbRowStrings,
    probabilityAtLeast,
    getTotalCardCount,
    getCategoryCardCount,
    firstHandProbability,
    secondHandProbability,
    simulateDraw,
    simulateDrawCounts,
} from './analysis/probabilityMath.js';
export {
    clearHistogramGraphs,
    updateHistogramCategorySelect,
    updateHistogramDOM,
} from './analysis/drawHistogramDom.js';

/** Cartes "tirées" dans la simulation (noms, ordre de tirage). */
let drawnCards: string[] = [];

/** Taille de la main de départ : 5 (going first) ou 6 (going second). Persistée en localStorage. */
let handSize: 5 | 6 = readHandSizeFromStorage();

export function setHandSize(size: 5 | 6): void {
    if (handSize === size) return;
    handSize = size;
    writeHandSizeToStorage(size);
    updateProbabilities();
    updateCategorySummary();
    updateDrawSimulationUI();
}

export function getHandSize(): 5 | 6 {
    return handSize;
}

/** Snapshot du Main Deck (nom, qty, engine, catégories). */
function getDeckMainSnapshot() {
    return buildMainDeckProbabilitySnapshot(getDeckState().main);
}

/** Retourne l'URL d'image d'une carte du Main, ou null. */
function getCardImageUrl(cardName: string): string | null {
    const want = cleanDeckCardDisplayName(cardName);
    const row = getDeckState().main.find((r) => cleanDeckCardDisplayName(r.name) === want);
    return row?.imageUrl ?? null;
}

/** Tire une carte au hasard dans le deck restant (pondéré par les quantités). Retourne le nom ou null. */
export function drawOneCard(): string | null {
    const snapshot = getDeckMainSnapshot();
    const deck = buildRemainingDrawPool(snapshot, countNameOccurrences(drawnCards));
    if (deck.length === 0 || drawnCards.length >= handSize) return null;
    const drawn = pickRandomFromPool(deck);
    if (!drawn) return null;
    drawnCards.push(drawn);
    updateDrawSimulationUI();
    updateCategorySummary();
    return drawn;
}

/** Réinitialise la simulation de tirage. */
export function resetDrawSimulation(): void {
    drawnCards = [];
    updateDrawSimulationUI();
    updateCategorySummary();
}

export function getDrawnCards(): string[] {
    return [...drawnCards];
}

function updateDrawSimulationUI(): void {
    const snapshot = getDeckMainSnapshot();
    const totalInDeck = snapshot.reduce((s, c) => s + c.qty, 0);
    refreshDrawSimulationPanel({
        drawnCardNames: drawnCards,
        handSize,
        resolveImageUrl: getCardImageUrl,
        totalMainDeckCards: totalInDeck,
    });
}

export function computeGlobalStats(): void {
    const main = getDeckState().main;
    applyBuilderMainTypeCountsAndBars(computeMainDeckTypeCounts(main));
    const breakdown = computeCompositionBreakdown(main);
    applyCompositionDetailPanelsHtml(buildCompositionDetailPanelsHtml(breakdown));
    refreshDeckInsightsPanel();
}

export function updateDeckCount(): void {
    const state = getDeckState();
    applyDeckSectionCountLabels(
        countCardsInDeckSection(state, 'main'),
        countCardsInDeckSection(state, 'extra'),
        countCardsInDeckSection(state, 'side'),
    );
    resetDrawSimulation();
    updateProbabilities();
    updateCategorySummary();
}

/** Grille cartes : pas de cellule proba par carte ; probas visibles dans l’onglet Analysis. */
export function updateProbabilities(): void {
    publishMainDeckTotalForHandSizeTools(getDeckState().main);
}

export function updateCategorySummary(): void {
    try {
        const input = buildAnalysisCategorySummaryDomInput(getDeckState().main, drawnCards, handSize);
        renderAnalysisCategorySummaryDom(input);
    } catch (error) {
        console.error(error);
    }
}

/** Lance 1000 simulations et met à jour l'histogramme (catégorie choisie + un mini-graph par catégorie). */
export function runSimulation1000AndUpdateHistogram(): void {
    const snapshot = getDeckMainSnapshot();
    runHistogramSimulation1000({
        cards: snapshot.map((r) => ({
            name: r.name,
            qty: r.qty,
            categories: r.categories,
        })),
        handSize,
    });
}
