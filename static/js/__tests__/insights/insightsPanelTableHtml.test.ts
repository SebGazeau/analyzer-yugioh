import { describe, expect, it } from 'vitest';
import {
    insightsFidraulisGyRowsHtml,
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
import type { DeckInsight, FidraulisGyResourceRow, NumberXyzSuggestion, SeventhTachyonXyzGroup } from '../../insights/types.js';
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

describe('insightsFidraulisGyRowsHtml', () => {
    it('regroupe par contexte, pilule confiance et avis (sans Chercher)', () => {
        const rows: FidraulisGyResourceRow[] = [
            {
                name: 'Enigmaster Packbit',
                quantity: 1,
                trust: 'verified',
                cardId: 72444406,
                note: 'Enigmaster Packbit',
                resourceTaxon: 'effect_on_sent_to_gy',
                resourceContextLabel: 'Déclenché si envoyé au Cimetière',
                resourceContextTitle: 'Effet déclenché si / quand cette carte est envoyée au Cimetière.',
            },
        ];
        const html = insightsFidraulisGyRowsHtml(rows, false);
        expect(html).toContain('suggestions-fidraulis-ctx-group');
        expect(html).toContain('suggestions-fidraulis-ctx-title');
        expect(html).toContain('Déclenché si envoyé au Cimetière');
        expect(html).toContain('title="Effet déclenché si / quand cette carte est envoyée au Cimetière."');
        expect(html).toContain('Enigmaster Packbit');
        expect(html).toContain('data-insights-fidraulis-trust="verified"');
        expect(html).toContain('suggestions-fidraulis-pill--verified');
        expect(html).toContain('data-insights-empty-cell');
        expect(html).not.toContain('data-insights-find-card');
    });

    it('ligne heuristique connectée : boutons Oui / Non', () => {
        const rows: FidraulisGyResourceRow[] = [
            {
                name: 'Test Heur',
                quantity: 1,
                trust: 'heuristic',
                cardId: 9990003,
                resourceTaxon: 'effect_on_sent_to_gy',
                resourceContextLabel: 'Court',
                resourceContextTitle: 'Long',
            },
        ];
        const html = insightsFidraulisGyRowsHtml(rows, true);
        expect(html).toContain('data-fidraulis-vote-cell="1"');
        expect(html).toContain('data-fidraulis-vote-btn="approve"');
        expect(html).toContain('data-fidraulis-vote-btn="reject"');
    });
});
