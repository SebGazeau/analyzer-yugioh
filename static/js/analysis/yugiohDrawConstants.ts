/**
 * Constantes de tirage / taille de main alignées sur les usages Analysis (probas, simulation).
 */

/** Nombre de cartes pour la main de départ (contexte probas « première main »). */
export const YGO_FIRST_HAND_DRAW_COUNT = 5;

/**
 * Nombre de cartes pour le second contexte (main à 6 ; colonnes P(≥1)…P(≥6) du tableau).
 */
export const YGO_SECOND_HAND_DRAW_COUNT = 6;

export type YgoHandDrawCount =
    typeof YGO_FIRST_HAND_DRAW_COUNT | typeof YGO_SECOND_HAND_DRAW_COUNT;
