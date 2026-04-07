import { describe, expect, it } from 'vitest';
import {
    DRAW_HISTOGRAM_MAIN_BAR_MAX_HEIGHT_PX,
    DRAW_HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX,
    drawHistogramMainBarWrapInnerHtml,
    drawHistogramMiniBarWrapInnerHtml,
} from '../analysis/drawHistogramBarHtml.js';
import {
    DRAW_HISTOGRAM_BAR_CLASS,
    DRAW_HISTOGRAM_COUNT_CLASS,
    DRAW_HISTOGRAM_MINI_BAR_CLASS,
} from '../analysis/drawHistogramDomSelectors.js';

describe('drawHistogramMainBarWrapInnerHtml', () => {
    it('barre, libellé k, compteur et title échappé', () => {
        const html = drawHistogramMainBarWrapInnerHtml({
            k: 0,
            n: 500,
            pctOfIterations: 50,
            heightPx: 60,
        });
        expect(html).toContain(`class="${DRAW_HISTOGRAM_BAR_CLASS}"`);
        expect(html).toContain('height: 60px');
        expect(html).toContain(`class="${DRAW_HISTOGRAM_COUNT_CLASS}">500<`);
        expect(html).toContain('title="');
        expect(html).toContain('500 simulations');
    });
});

describe('drawHistogramMiniBarWrapInnerHtml', () => {
    it('background couleur token et hauteur', () => {
        const html = drawHistogramMiniBarWrapInnerHtml({
            k: 3,
            n: 12,
            iterations: 1000,
            heightPx: 28,
            color: 'var(--color-info)',
        });
        expect(html).toContain(`class="${DRAW_HISTOGRAM_MINI_BAR_CLASS}"`);
        expect(html).toContain('background:var(--color-info)');
        expect(html).toContain('height:28px');
        expect(html).toContain('>12<');
    });
});

describe('constantes hauteur', () => {
    it('max hauteurs inchangées (contrat DOM)', () => {
        expect(DRAW_HISTOGRAM_MAIN_BAR_MAX_HEIGHT_PX).toBe(120);
        expect(DRAW_HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX).toBe(56);
    });
});
