import { describe, expect, it } from 'vitest';
import { ANALYSIS_CATEGORY_SUMMARY_SECTION_ENGINES } from '../analysis/analysisCategorySummaryCopy.js';
import {
    analysisCategorySummaryDotClass,
    analysisCategorySummaryTableDataRowInnerHtml,
    analysisSectionHeaderRowInnerHtml,
    builderCategoryListRowInnerHtml,
} from '../analysis/analysisCategorySummaryTableHtml.js';
import { ANALYSIS_SECTION_HEADER_TOGGLE_TEXT } from '../analysis/analysisTableDomSelectors.js';
import { ANALYSIS_TD_COUNT_CLASS, ANALYSIS_TD_PROB5_CLASS } from '../analysis/analysisCategorySummaryDomSelectors.js';

describe('analysisSectionHeaderRowInnerHtml', () => {
    it('sans repliable : strong seul', () => {
        const html = analysisSectionHeaderRowInnerHtml('Titre', false);
        expect(html).toContain('<strong>Titre</strong>');
        expect(html).not.toContain(ANALYSIS_SECTION_HEADER_TOGGLE_TEXT);
    });

    it('repliable : toggle + strong', () => {
        const html = analysisSectionHeaderRowInnerHtml(ANALYSIS_CATEGORY_SUMMARY_SECTION_ENGINES, true);
        expect(html).toContain(ANALYSIS_SECTION_HEADER_TOGGLE_TEXT);
        expect(html).toContain('Engines');
    });
});

describe('analysisCategorySummaryTableDataRowInnerHtml', () => {
    it('colonne comptage et probas supplémentaires', () => {
        const html = analysisCategorySummaryTableDataRowInnerHtml({
            dotClass: 'dot-x',
            firstCellContentHtml: '<strong>A</strong>',
            K: 3,
            pctDeck: '10.0%',
            probs: ['0%', '1%', '2%'],
        });
        expect(html).toContain('class="dot-x"');
        expect(html).toContain(`class="${ANALYSIS_TD_COUNT_CLASS}">3<`);
        expect(html).toContain(`class="${ANALYSIS_TD_PROB5_CLASS}">0%<`);
        expect(html).toContain('>1%<');
        expect(html).toContain('>2%<');
    });
});

describe('analysisCategorySummaryDotClass', () => {
    it('cycle les modificateurs', () => {
        expect(analysisCategorySummaryDotClass(0)).not.toBe(analysisCategorySummaryDotClass(1));
        expect(analysisCategorySummaryDotClass(0)).toBe(analysisCategorySummaryDotClass(8));
    });
});

describe('builderCategoryListRowInnerHtml', () => {
    it('échappe le nom et barre en %', () => {
        const html = builderCategoryListRowInnerHtml('<b>', 2, 50);
        expect(html).not.toContain('<b>');
        expect(html).toContain('width:50%');
        expect(html).toContain('>2<');
    });
});
