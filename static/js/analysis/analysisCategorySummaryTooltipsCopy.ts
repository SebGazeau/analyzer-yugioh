/**
 * Textes d’infobulles / légendes du résumé catégories (Analysis + miroir builder).
 */

import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

/** Tooltip ligne de tri par catégorie (liste builder / analysis). */
export function builderCategorySortRowTitle(categoryName: string): string {
    return `Trier le Main Deck : ${categoryName} en premier`;
}

/** Légende sous le hero probas (référence groupe + effectif deck). */
export function analysisHeroGroupReferenceLabel(
    groupName: string,
    firstK: number,
    totalCards: number,
): string {
    return `Réf. : ${groupName} (${firstK} / ${totalCards} cartes) ${TEXT_EM_DASH} P(≥1) en 5 ou 6 tirages.`;
}

/** `title` d’un segment de la bande composition / barre catégories (pourcentage arrondi 1 décimale). */
export function categoryCompositionSegmentTooltip(name: string, K: number, pct: number): string {
    return `${name}: ${K} (${pct.toFixed(1)}%)`;
}
