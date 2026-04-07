import { describe, expect, it } from 'vitest';
import { categorySummarySimulationBannerText } from '../analysis/categorySummarySimulationCopy.js';

describe('categorySummarySimulationCopy', () => {
    it('forme du bandeau simulation', () => {
        const s = categorySummarySimulationBannerText({
            drawnCount: 2,
            totalCards: 38,
            numDraws: 4,
        });
        expect(s).toContain('Simulation');
        expect(s).toContain('2');
        expect(s).toContain('38');
        expect(s).toContain('4');
        expect(s).toContain('tirée');
        expect(s).toContain('restantes');
    });
});
