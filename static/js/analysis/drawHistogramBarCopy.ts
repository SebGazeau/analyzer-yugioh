/**
 * Textes `title` / infobulles des barres d’histogramme (simulation tirage).
 */

/** Infobulle barre principale (bucket k, nombre de sims n, pourcentage). */
export function drawHistogramMainBarTitle(k: number, simulationCount: number, pctOfIterations: number): string {
    return `${k} carte(s) de la catégorie en main : ${simulationCount} simulations (${pctOfIterations.toFixed(1)} %)`;
}

/** Infobulle barre mini (bucket k, compte n, total itérations). */
export function drawHistogramMiniBarTitle(k: number, count: number, iterations: number): string {
    return `${k} en main : ${count} / ${iterations}`;
}
