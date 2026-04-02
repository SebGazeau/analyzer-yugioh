// Statistiques et probabilités pour le deck
import { refreshDeckInsightsPanel } from './insights/panel.js';
import { getDeckState } from './deck.js';
import {
    applyBuilderMainTypeCountsAndBars,
    applyCompositionDetailPanelsHtml,
    applyDeckSectionCountLabels,
} from './analysis/builderStatsDom.js';
import {
    buildCompositionDetailPanelsHtml,
    computeCompositionBreakdown,
} from './analysis/compositionBreakdown.js';
import {
    buildFullDeckCategorySummaries,
    buildRemainingDeckCategorySummaries,
    cleanDeckCardDisplayName,
    countNameOccurrences,
    remainingDrawCountForProbTable,
    type CategoryEngineSummaryMap,
} from './analysis/categorySummaryData.js';
import { renderAnalysisCategorySummaryDom } from './analysis/categorySummaryDom.js';
import { buildMainDeckProbabilitySnapshot } from './analysis/deckMainSnapshot.js';
import { runHistogramSimulation1000 } from './analysis/drawHistogramDom.js';
import { refreshDrawSimulationPanel } from './analysis/drawSimulationDom.js';
import { buildRemainingDrawPool, pickRandomFromPool } from './analysis/drawSimulationPile.js';
import { readHandSizeFromStorage, writeHandSizeToStorage } from './analysis/handSizeStorage.js';
import { computeMainDeckTypeCounts } from './analysis/mainDeckTypeCounts.js';

export type { CompositionBreakdown } from './analysis/compositionBreakdown.js';
export type { ProbabilityCardEntry } from './analysis/probabilityMath.js';
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

/** Met à jour le titre de la section Analysis (ex. "Dragon Rulers — "). Appelé au chargement / reset du deck. */
export function setAnalysisDeckName(name: string): void {
    const el = document.getElementById("analysis-deck-name");
    if (!el) return;
    const text = name.trim();
    el.textContent = text ? `${text} — ` : "";
}

/** Snapshot du Main Deck (nom, qty, engine, catégories). */
function getDeckMainSnapshot() {
    return buildMainDeckProbabilitySnapshot(getDeckState().main);
}

/** Retourne l'URL d'image d'une carte du Main, ou null. */
function getCardImageUrl(cardName: string): string | null {
    const want = cleanDeckCardDisplayName(cardName);
    const row = getDeckState().main.find(r => cleanDeckCardDisplayName(r.name) === want);
    return row?.imageUrl ?? null;
}

/** Résumé et totaux pour le deck *restant* (après simulation). */
function getRemainingSummary() {
    const snapshot = getDeckMainSnapshot();
    const drawnCounts = countNameOccurrences(drawnCards);
    const { summary, engineSummary, totalCards } = buildRemainingDeckCategorySummaries(snapshot, drawnCounts);
    const numDraws = remainingDrawCountForProbTable(handSize, drawnCards.length);
    return { summary, engineSummary, totalCards, numDraws };
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

function countInGrid(section: 'main' | 'extra' | 'side'): number {
    const state = getDeckState();
    return state[section].reduce((sum, r) => sum + r.quantity, 0);
}

export function updateDeckCount(): void {
    const main = countInGrid('main');
    const extra = countInGrid('extra');
    const side = countInGrid('side');
    applyDeckSectionCountLabels(main, extra, side);
    resetDrawSimulation();
    updateProbabilities();
    updateCategorySummary(); // refait le tableau après reset (deck peut avoir changé)
}

/** Grille cartes : pas de cellule proba par carte ; probas visibles dans l’onglet Analysis. */
export function updateProbabilities(): void {
    const main = getDeckState().main;
    const totalCards = main.reduce((sum, r) => sum + r.quantity, 0);
    if (totalCards === 0) return;
    (window as any).__deckTotalForHandSize = totalCards;
}

export function updateCategorySummary(): void {
    try {
        let simulationBanner: string | null = null;
        let summary: CategoryEngineSummaryMap;
        let engineSummary: CategoryEngineSummaryMap;
        let totalCards: number;
        let numDraws: number;

        if (drawnCards.length > 0) {
            const rem = getRemainingSummary();
            summary = rem.summary;
            engineSummary = rem.engineSummary;
            totalCards = rem.totalCards;
            numDraws = rem.numDraws;
            simulationBanner = `Simulation : ${drawnCards.length} carte(s) tirée(s), ${totalCards} restantes (probas pour ${numDraws} tirage(s) restant(s))`;
        } else {
            const main = getDeckState().main;
            const built = buildFullDeckCategorySummaries(
                main.map((r) => ({
                    name: r.name,
                    quantity: r.quantity,
                    engine: r.engine || '',
                    categories: r.categories || [],
                })),
            );
            summary = built.summary;
            engineSummary = built.engineSummary;
            totalCards = built.totalCards;
            numDraws = handSize;
        }

        renderAnalysisCategorySummaryDom({
            simulationBanner,
            summary,
            engineSummary,
            totalCards,
            numDraws,
            handSize,
        });
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
