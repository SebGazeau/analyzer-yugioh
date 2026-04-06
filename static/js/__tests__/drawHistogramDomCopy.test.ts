import { describe, expect, it } from 'vitest';
import { DECK_CARD_EDIT_DIALOG_TITLE } from '../utils/deckCardEditLabels.js';
import { TEXT_ELLIPSIS, TEXT_EM_DASH } from '../utils/textPlaceholders.js';
import {
    DRAW_HISTOGRAM_EMPTY_DECK_CATEGORIES_MSG,
    DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY,
    DRAW_HISTOGRAM_SIM_ITERATIONS,
    drawHistogramContainerAriaLabel,
    drawHistogramExplanationText,
    drawHistogramHeadingActive,
    drawHistogramHeadingIdle,
} from '../analysis/drawHistogramDomCopy.js';

describe('drawHistogramDomCopy', () => {
    it('itérations + libellés UI histogramme stables', () => {
        expect(DRAW_HISTOGRAM_SIM_ITERATIONS).toBe(1000);
        expect(drawHistogramHeadingIdle(1000)).toBe('Distribution (1000 tirages)');
        expect(drawHistogramHeadingActive(1000, 'Starter')).toContain('Starter');
        expect(drawHistogramContainerAriaLabel(1000, 'X')).toContain('1000');
        expect(DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY).toContain('Aucune');
        expect(DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY.split(TEXT_EM_DASH).length - 1).toBe(2);
        expect(drawHistogramHeadingActive(1000, 'X').includes(TEXT_EM_DASH)).toBe(true);
        expect(DRAW_HISTOGRAM_EMPTY_DECK_CATEGORIES_MSG).toContain(DECK_CARD_EDIT_DIALOG_TITLE);
        expect(drawHistogramExplanationText(1000, 'Starter')).toContain(TEXT_ELLIPSIS);
    });
});
