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

export {
    DRAW_HISTOGRAM_EMPTY_DECK_CATEGORIES_MSG,
    DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY,
    DRAW_HISTOGRAM_SELECT_PLACEHOLDER_PICK,
    DRAW_HISTOGRAM_SIM_ITERATIONS,
    drawHistogramAllCategoriesTitle,
    drawHistogramContainerAriaLabel,
    drawHistogramEmptyCategoryMsg,
    drawHistogramExplanationText,
    drawHistogramHeadingActive,
    drawHistogramHeadingIdle,
} from './drawHistogramDomCopy.js';
