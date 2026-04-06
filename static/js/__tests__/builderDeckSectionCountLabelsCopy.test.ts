import { describe, expect, it } from 'vitest';
import {
    BUILDER_DECK_COUNT_LABEL_EXTRA,
    BUILDER_DECK_COUNT_LABEL_MAIN,
    BUILDER_DECK_COUNT_LABEL_SIDE,
    BUILDER_DECK_SECTION_COUNT_LABEL,
    BUILDER_DECK_SECTION_SUMMARY_SEPARATOR,
} from '../analysis/builderDeckSectionCountLabelsCopy.js';
import { DECK_SECTIONS } from '../deckSectionOrder.js';

describe('builderDeckSectionCountLabelsCopy', () => {
    it('libellés MAIN / EXTRA / SIDE', () => {
        expect(BUILDER_DECK_COUNT_LABEL_MAIN).toBe('MAIN');
        expect(BUILDER_DECK_COUNT_LABEL_EXTRA).toBe('EXTRA');
        expect(BUILDER_DECK_COUNT_LABEL_SIDE).toBe('SIDE');
    });

    it('Record aligné sur DECK_SECTIONS', () => {
        for (const s of DECK_SECTIONS) {
            expect(BUILDER_DECK_SECTION_COUNT_LABEL[s].length).toBeGreaterThan(0);
        }
    });

    it('séparateur résumé zones', () => {
        expect(BUILDER_DECK_SECTION_SUMMARY_SEPARATOR).toBe(' / ');
    });
});
