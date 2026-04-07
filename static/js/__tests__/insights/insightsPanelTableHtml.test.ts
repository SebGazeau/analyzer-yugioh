import { describe, expect, it } from 'vitest';
import {
    insightsNumberSuggestionRowsHtml,
    insightsSeventhTachyonDetailRowsHtml,
    insightsSummaryRowsHtml,
} from '../../insights/insightsPanelTableHtml.js';
import {
    INSIGHTS_DETAIL_ROW_DATA_ATTR,
    INSIGHTS_KIND_DATA_ATTR,
    INSIGHTS_MATCHES_MAIN_DATA_ATTR,
    INSIGHTS_NUMBER_SUGGESTION_ATTR_RACE_SEPARATOR,
    INSIGHTS_SUMMARY_ROW_DATA_ATTR,
    INSIGHTS_SUGGEST_ROW_DATA_ATTR,
} from '../../insights/insightsDomSelectors.js';
import type { DeckInsight, NumberXyzSuggestion, SeventhTachyonXyzGroup } from '../../insights/types.js';
import { TEXT_EM_DASH } from '../../utils/textPlaceholders.js';

describe('insightsSummaryRowsHtml', () => {
    it('émet une ligne avec kind / severity / libellés Seventh Tachyon', () => {
        const insights: DeckInsight[] = [
            {
                id: '1',
                kind: 'seventh_tachyon',
                severity: 'active',
                title: 'T',
                summary: 'S',
            },
        ];
        const html = insightsSummaryRowsHtml(insights);
        expect(html).toContain(INSIGHTS_SUMMARY_ROW_DATA_ATTR);
        expect(html).toContain(`${INSIGHTS_KIND_DATA_ATTR}="seventh_tachyon"`);
        expect(html).toContain('Seventh Tachyon');
        expect(html).toContain('Actif');
        expect(html).toContain('>T<');
    });
});

describe('insightsNumberSuggestionRowsHtml', () => {
    it('inclut matches-deck et bouton trouver carte', () => {
        const suggested: NumberXyzSuggestion[] = [
            {
                name: 'Number 39',
                numberIndex: 39,
                rank: 4,
                attribute: 'LIGHT',
                race: 'Warrior',
                matchesDeck: true,
                matchingCards: [],
            },
        ];
        const html = insightsNumberSuggestionRowsHtml(suggested);
        expect(html).toContain(INSIGHTS_SUGGEST_ROW_DATA_ATTR);
        expect(html).toContain(`${INSIGHTS_MATCHES_MAIN_DATA_ATTR}="true"`);
        expect(html).toContain('Number 39');
        expect(html).toContain(`LIGHT${INSIGHTS_NUMBER_SUGGESTION_ATTR_RACE_SEPARATOR}Warrior`);
    });
});

describe('insightsSeventhTachyonDetailRowsHtml', () => {
    it('liste les cibles ou tiret si vide', () => {
        const groups: SeventhTachyonXyzGroup[] = [
            {
                xyzName: 'C101',
                numberIndex: 101,
                rank: 5,
                targets: [{ name: 'Mat', quantity: 2 }],
            },
            { xyzName: 'C102', numberIndex: 102, rank: 4, targets: [] },
        ];
        const html = insightsSeventhTachyonDetailRowsHtml(groups);
        expect(html).toContain(INSIGHTS_DETAIL_ROW_DATA_ATTR);
        expect(html).toContain('C101');
        expect(html).toContain('Mat');
        const c102Idx = html.indexOf('C102');
        expect(c102Idx).toBeGreaterThan(-1);
        expect(html.slice(c102Idx)).toContain(TEXT_EM_DASH);
    });
});
