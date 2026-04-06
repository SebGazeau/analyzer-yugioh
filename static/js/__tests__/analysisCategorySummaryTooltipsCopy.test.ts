import { describe, expect, it } from 'vitest';
import {
    analysisHeroGroupReferenceLabel,
    builderCategorySortRowTitle,
} from '../analysis/analysisCategorySummaryTooltipsCopy.js';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

describe('analysisCategorySummaryTooltipsCopy', () => {
    it('analysisHeroGroupReferenceLabel forme la légende hero', () => {
        const s = analysisHeroGroupReferenceLabel('Engine A', 3, 40);
        expect(s).toContain('Engine A');
        expect(s).toContain('3');
        expect(s).toContain('40');
        expect(s).toContain('P(≥1)');
        expect(s).toContain(TEXT_EM_DASH);
    });

    it('builderCategorySortRowTitle inclut le nom de catégorie', () => {
        expect(builderCategorySortRowTitle('Hand Trap')).toContain('Hand Trap');
        expect(builderCategorySortRowTitle('X')).toContain('Main Deck');
    });
});
