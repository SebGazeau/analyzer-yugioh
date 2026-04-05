/**
 * Classes CSS du rendu histogrammes (simulation tirage, page Analysis).
 */

export const DRAW_HISTOGRAM_EMPTY_CLASS = 'draw-histogram-empty';
export const DRAW_HISTOGRAM_CHART_CLASS = 'draw-histogram-chart';
export const DRAW_HISTOGRAM_BAR_WRAP_CLASS = 'draw-histogram-bar-wrap';
export const DRAW_HISTOGRAM_BAR_CLASS = 'draw-histogram-bar';
export const DRAW_HISTOGRAM_LABEL_CLASS = 'draw-histogram-label';
export const DRAW_HISTOGRAM_COUNT_CLASS = 'draw-histogram-count';

export const DRAW_HISTOGRAM_MINI_CLASS = 'draw-histogram-mini';
export const DRAW_HISTOGRAM_MINI_TITLE_CLASS = 'draw-histogram-mini-title';
export const DRAW_HISTOGRAM_MINI_CHART_CLASS = 'draw-histogram-mini-chart';
export const DRAW_HISTOGRAM_MINI_BAR_WRAP_CLASS = 'draw-histogram-mini-bar-wrap';
export const DRAW_HISTOGRAM_MINI_BAR_CLASS = 'draw-histogram-mini-bar';
export const DRAW_HISTOGRAM_MINI_LABEL_CLASS = 'draw-histogram-mini-label';
export const DRAW_HISTOGRAM_MINI_COUNT_CLASS = 'draw-histogram-mini-count';

/**
 * Couleurs de remplissage des barres mini (références `var(--*)` depuis tokens.css).
 * Ordre stable : cyclé par index de catégorie.
 */
export const DRAW_HISTOGRAM_CATEGORY_FILL_VARS: readonly string[] = [
    'var(--color-zone-main)',
    'var(--color-zone-extra)',
    'var(--color-zone-side)',
    'var(--color-gold)',
    'var(--color-info)',
    'var(--color-success)',
    'var(--color-amber)',
    'var(--color-danger)',
];

/** Nombre de simulations pour un run histogramme (UI + logique). */
export const DRAW_HISTOGRAM_SIM_ITERATIONS = 1000;

export function drawHistogramHeadingIdle(iterations: number): string {
    return `Distribution (${iterations} tirages)`;
}

export function drawHistogramHeadingActive(iterations: number, category: string): string {
    return `Distribution (${iterations} tirages) — Catégorie : ${category}`;
}

export function drawHistogramExplanationText(iterations: number, category: string): string {
    return `En abscisse : nombre de cartes « ${category} » en main (0, 1, 2, …). Hauteur des barres : nombre de simulations sur ${iterations} ayant ce résultat.`;
}

export function drawHistogramAllCategoriesTitle(iterations: number): string {
    return `Toutes les catégories (${iterations} tirages chacune)`;
}

/** Option placeholder du select catégorie (aucune dans le deck). */
export const DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY = '— Aucune catégorie —';
/** Option placeholder du select catégorie (choix requis). */
export const DRAW_HISTOGRAM_SELECT_PLACEHOLDER_PICK = '— Choisir une catégorie —';

/** Message histogramme vide : deck sans catégories assignées. */
export const DRAW_HISTOGRAM_EMPTY_DECK_CATEGORIES_MSG =
    'Deck vide ou aucune catégorie. Assignez des catégories aux cartes (via « Modifier la carte ») pour afficher la distribution.';

export function drawHistogramEmptyCategoryMsg(categoryLabel: string): string {
    return `Aucune donnée pour "${categoryLabel}".`;
}

export function drawHistogramContainerAriaLabel(iterations: number, categoryLabel: string): string {
    return `Distribution sur ${iterations} tirages : ${categoryLabel}`;
}
