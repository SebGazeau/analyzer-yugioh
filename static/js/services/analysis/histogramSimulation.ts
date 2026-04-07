/**
 * Agrégation pure des simulations d’histogramme par catégorie (page Analysis).
 */

import { getAllCategories, simulateDrawCounts, type ProbabilityCardEntry } from '../../analysis/probabilityMath.js';
import type { YgoHandDrawCount } from '../../analysis/yugiohDrawConstants.js';

/** Catégories triées + histogramme par nom de catégorie (même sémantique que l’UI). */
export function buildHistogramsByCategory(
    cards: ProbabilityCardEntry[],
    handSize: YgoHandDrawCount,
    iterations: number,
): { categories: string[]; getHistogram: (category: string) => Record<number, number> } {
    const categories = getAllCategories(cards).sort();
    const map = new Map<string, Record<number, number>>();
    for (const cat of categories) {
        map.set(cat, simulateDrawCounts(cards, cat, handSize, iterations));
    }
    return {
        categories,
        getHistogram: (category: string) => map.get(category) ?? {},
    };
}
