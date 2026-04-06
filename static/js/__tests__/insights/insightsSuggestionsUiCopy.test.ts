import { describe, expect, it } from 'vitest';
import {
    INSIGHTS_FIND_CARD_BUTTON_LABEL,
    INSIGHTS_FIND_CARD_BUTTON_TITLE,
    INSIGHTS_SUGGEST_ROW_TITLE,
    insightsMainMatchChipTitle,
    insightsMainMatchQtyAriaLabel,
} from '../../insights/insightsSuggestionsUiCopy.js';

describe('insightsSuggestionsUiCopy', () => {
    it('titres panel Suggestions (match chip, ligne Xyz, Chercher)', () => {
        expect(insightsMainMatchChipTitle('M')).toContain('M');
        expect(INSIGHTS_SUGGEST_ROW_TITLE).toContain('Xyz');
        expect(INSIGHTS_FIND_CARD_BUTTON_TITLE).toContain('Builder');
        expect(INSIGHTS_FIND_CARD_BUTTON_LABEL).toBe('Chercher');
        expect(insightsMainMatchQtyAriaLabel(3)).toBe('3 exemplaires');
    });
});
