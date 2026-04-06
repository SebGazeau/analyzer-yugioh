/**
 * Texte du bandeau « simulation de tirage » (résumé catégories Analysis).
 */

export function categorySummarySimulationBannerText(params: {
    drawnCount: number;
    totalCards: number;
    numDraws: number;
}): string {
    const { drawnCount, totalCards, numDraws } = params;
    return `Simulation : ${drawnCount} carte(s) tirée(s), ${totalCards} restantes (probas pour ${numDraws} tirage(s) restant(s))`;
}
