import { describe, expect, it } from 'vitest';
import { drawHistogramMainBarTitle, drawHistogramMiniBarTitle } from '../analysis/drawHistogramBarCopy.js';

describe('drawHistogramBarCopy', () => {
    it('drawHistogramMainBarTitle', () => {
        expect(drawHistogramMainBarTitle(2, 100, 10)).toContain('2 carte(s)');
        expect(drawHistogramMainBarTitle(2, 100, 10)).toContain('100 simulations');
        expect(drawHistogramMainBarTitle(2, 100, 10)).toContain('10.0 %');
    });

    it('drawHistogramMiniBarTitle', () => {
        expect(drawHistogramMiniBarTitle(1, 50, 1000)).toBe('1 en main : 50 / 1000');
    });
});
