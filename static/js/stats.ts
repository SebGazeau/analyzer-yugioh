// Statistiques et probabilités pour le deck — façade (réexports + branchement deck / UI).
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
import { countNameOccurrences } from './analysis/categorySummaryData.js';
import { buildAnalysisCategorySummaryDomInput } from './analysis/categorySummaryOrchestrator.js';
import { renderAnalysisCategorySummaryDom } from './analysis/categorySummaryDom.js';
import { findMainDeckCardImageUrl } from './analysis/deckMainImageLookup.js';
import { countCardsInDeckSection } from './analysis/deckSectionQuantity.js';
import { buildMainDeckProbabilitySnapshot } from './analysis/deckMainSnapshot.js';
import {
    applyHandSize,
    clearDrawnCardNames,
    getDrawnCardNamesCopy,
    getDrawnCardNamesReadonly,
    getHandSize,
    pushDrawnCardName,
} from './analysis/drawSimulationState.js';
import { runHistogramSimulation1000 } from './analysis/drawHistogramDom.js';
import { refreshDrawSimulationPanel } from './analysis/drawSimulationDom.js';
import { buildRemainingDrawPool, pickRandomFromPool } from './analysis/drawSimulationPile.js';
import { computeMainDeckTypeCounts } from './analysis/mainDeckTypeCounts.js';

export type { CompositionBreakdown } from './analysis/compositionBreakdown.js';
export type { ProbabilityCardEntry } from './analysis/probabilityMath.js';
export { setAnalysisDeckName } from './analysis/analysisPageDom.js';
export { getHandSize };
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

function getDeckMainSnapshot() {
    return buildMainDeckProbabilitySnapshot(getDeckState().main);
}

export function setHandSize(size: 5 | 6): void {
    if (!applyHandSize(size)) return;
    updateProbabilities();
    updateCategorySummary();
    updateDrawSimulationUI();
}

/** Tire une carte au hasard dans le deck restant (pondéré par les quantités). Retourne le nom ou null. */
export function drawOneCard(): string | null {
    const snapshot = getDeckMainSnapshot();
    const drawnReadonly = getDrawnCardNamesReadonly();
    const deck = buildRemainingDrawPool(snapshot, countNameOccurrences(drawnReadonly));
    if (deck.length === 0 || drawnReadonly.length >= getHandSize()) return null;
    const drawn = pickRandomFromPool(deck);
    if (!drawn) return null;
    pushDrawnCardName(drawn);
    updateDrawSimulationUI();
    updateCategorySummary();
    return drawn;
}

export function resetDrawSimulation(): void {
    clearDrawnCardNames();
    updateDrawSimulationUI();
    updateCategorySummary();
}

export function getDrawnCards(): string[] {
    return getDrawnCardNamesCopy();
}

function updateDrawSimulationUI(): void {
    const snapshot = getDeckMainSnapshot();
    const totalInDeck = snapshot.reduce((s, c) => s + c.qty, 0);
    refreshDrawSimulationPanel({
        drawnCardNames: getDrawnCardNamesCopy(),
        handSize: getHandSize(),
        resolveImageUrl: (name) => findMainDeckCardImageUrl(getDeckState().main, name),
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

export function updateProbabilities(): void {
    publishMainDeckTotalForHandSizeTools(getDeckState().main);
}

export function updateCategorySummary(): void {
    try {
        const input = buildAnalysisCategorySummaryDomInput(
            getDeckState().main,
            getDrawnCardNamesReadonly(),
            getHandSize(),
        );
        renderAnalysisCategorySummaryDom(input);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Point d’entrée unique après mutation du deck (grilles, DnD, popover, import, chargement serveur).
 * Enchaîne `updateDeckCount` (labels, reset simu tirage, probas, catégories) puis `computeGlobalStats` (composition, insights).
 */
export function syncBuilderStatsFromDeck(): void {
    updateDeckCount();
    computeGlobalStats();
}

export function runSimulation1000AndUpdateHistogram(): void {
    const snapshot = getDeckMainSnapshot();
    runHistogramSimulation1000({
        cards: snapshot.map((r) => ({
            name: r.name,
            qty: r.qty,
            categories: r.categories,
        })),
        handSize: getHandSize(),
    });
}
