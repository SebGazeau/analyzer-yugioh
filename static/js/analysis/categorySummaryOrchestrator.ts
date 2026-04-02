/**
 * Construit l’entrée DOM du résumé catégories (deck plein vs simulation de tirage).
 */

import { buildMainDeckProbabilitySnapshot } from './deckMainSnapshot.js';
import {
    buildFullDeckCategorySummaries,
    buildRemainingDeckCategorySummaries,
    countNameOccurrences,
    remainingDrawCountForProbTable,
} from './categorySummaryData.js';
import type { AnalysisCategorySummaryDomInput } from './categorySummaryDom.js';

export type MainRowLikeForCategorySummary = {
    name: string;
    quantity: number;
    engine?: string;
    categories?: string[];
};

export function buildAnalysisCategorySummaryDomInput(
    main: ReadonlyArray<MainRowLikeForCategorySummary>,
    drawnCardNames: readonly string[],
    handSize: 5 | 6,
): AnalysisCategorySummaryDomInput {
    const snapshot = buildMainDeckProbabilitySnapshot(main);

    if (drawnCardNames.length > 0) {
        const drawnCounts = countNameOccurrences(drawnCardNames);
        const { summary, engineSummary, totalCards } = buildRemainingDeckCategorySummaries(
            snapshot,
            drawnCounts,
        );
        const numDraws = remainingDrawCountForProbTable(handSize, drawnCardNames.length);
        return {
            simulationBanner: `Simulation : ${drawnCardNames.length} carte(s) tirée(s), ${totalCards} restantes (probas pour ${numDraws} tirage(s) restant(s))`,
            summary,
            engineSummary,
            totalCards,
            numDraws,
            handSize,
        };
    }

    const built = buildFullDeckCategorySummaries(
        main.map((r) => ({
            name: r.name,
            quantity: r.quantity,
            engine: r.engine || '',
            categories: r.categories || [],
        })),
    );

    return {
        simulationBanner: null,
        summary: built.summary,
        engineSummary: built.engineSummary,
        totalCards: built.totalCards,
        numDraws: handSize,
        handSize,
    };
}
