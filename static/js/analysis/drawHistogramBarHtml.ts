/**
 * HTML interne des barres d’histogramme (principal + mini par catégorie).
 */

import { drawHistogramMainBarTitle, drawHistogramMiniBarTitle } from './drawHistogramBarCopy.js';
import {
    DRAW_HISTOGRAM_BAR_CLASS,
    DRAW_HISTOGRAM_COUNT_CLASS,
    DRAW_HISTOGRAM_LABEL_CLASS,
    DRAW_HISTOGRAM_MINI_BAR_CLASS,
    DRAW_HISTOGRAM_MINI_COUNT_CLASS,
    DRAW_HISTOGRAM_MINI_LABEL_CLASS,
} from './drawHistogramDomSelectors.js';
import { cssLengthPx } from '../utils/cssInlineLength.js';
import { escapeAttr } from '../utils/html.js';

export const DRAW_HISTOGRAM_MAIN_BAR_MAX_HEIGHT_PX = 120;

export const DRAW_HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX = 56;

export type DrawHistogramMainBarParams = {
    k: number;
    n: number;
    /** Part des itérations pour ce bucket (0–100). */
    pctOfIterations: number;
    heightPx: number;
};

/** Contenu d’un `draw-histogram-bar-wrap` (barre + libellé k + compteur). */
export function drawHistogramMainBarWrapInnerHtml(p: DrawHistogramMainBarParams): string {
    const title = drawHistogramMainBarTitle(p.k, p.n, p.pctOfIterations);
    return `
            <div class="${DRAW_HISTOGRAM_BAR_CLASS}" style="height: ${cssLengthPx(p.heightPx)}" title="${escapeAttr(title)}"></div>
            <span class="${DRAW_HISTOGRAM_LABEL_CLASS}">${p.k}</span>
            <span class="${DRAW_HISTOGRAM_COUNT_CLASS}">${p.n}</span>
        `;
}

export type DrawHistogramMiniBarParams = {
    k: number;
    n: number;
    iterations: number;
    heightPx: number;
    /** Référence CSS (`var(--…)`) depuis `DRAW_HISTOGRAM_CATEGORY_FILL_VARS`. */
    color: string;
};

/** Contenu d’un `draw-histogram-mini-bar-wrap`. */
export function drawHistogramMiniBarWrapInnerHtml(p: DrawHistogramMiniBarParams): string {
    const title = drawHistogramMiniBarTitle(p.k, p.n, p.iterations);
    return `
            <div class="${DRAW_HISTOGRAM_MINI_BAR_CLASS}" style="height:${cssLengthPx(p.heightPx)};background:${p.color}" title="${escapeAttr(title)}"></div>
            <span class="${DRAW_HISTOGRAM_MINI_LABEL_CLASS}">${p.k}</span>
            <span class="${DRAW_HISTOGRAM_MINI_COUNT_CLASS}">${p.n}</span>
        `;
}
