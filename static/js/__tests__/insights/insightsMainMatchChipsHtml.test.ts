import { describe, expect, it } from 'vitest';
import { insightsMainMatchChipsHtml } from '../../insights/insightsMainMatchChipsHtml.js';
import {
    INSIGHTS_ADD_DECK_CARD_DATA_ATTR,
    INSIGHTS_ADD_DECK_CARD_DATA_ATTR_VALUE,
    INSIGHTS_CARD_NAME_DATA_ATTR,
    INSIGHTS_EMPTY_CELL_DATA_ATTR,
    INSIGHTS_MAIN_MATCH_DATA_ATTR,
    INSIGHTS_MAIN_MATCHES_DATA_ATTR,
    INSIGHTS_MAIN_MATCH_THUMB_PLACEHOLDER_TEXT,
    INSIGHTS_MATCH_THUMB_DATA_ATTR,
    INSIGHTS_SECTION_DATA_ATTR,
    SUGGESTIONS_MAIN_MATCH_THUMB_CLASS,
    SUGGESTIONS_MAIN_MATCHES_CLASS,
} from '../../insights/insightsDomSelectors.js';
import { TEXT_EM_DASH, TEXT_MULTIPLICATION_SIGN } from '../../utils/textPlaceholders.js';
import type { MatchingCardPreview } from '../../insights/types.js';

describe('insightsMainMatchChipsHtml', () => {
    it('vide : tiret + attribut cellule vide', () => {
        const html = insightsMainMatchChipsHtml([]);
        expect(html).toContain(INSIGHTS_EMPTY_CELL_DATA_ATTR);
        expect(html).toContain(TEXT_EM_DASH);
        expect(html).not.toContain(SUGGESTIONS_MAIN_MATCHES_CLASS);
    });

    it('une carte avec image : wrapper matches + img 44×64 lazy', () => {
        const cards: MatchingCardPreview[] = [
            { name: 'Dark Magician', quantity: 1, section: 'main', imageUrl: '/i.jpg' },
        ];
        const html = insightsMainMatchChipsHtml(cards);
        expect(html).toContain(`class="${SUGGESTIONS_MAIN_MATCHES_CLASS}"`);
        expect(html).toContain(INSIGHTS_MAIN_MATCHES_DATA_ATTR);
        expect(html).toContain(`${INSIGHTS_MAIN_MATCH_DATA_ATTR}`);
        expect(html).toContain(
            `${INSIGHTS_ADD_DECK_CARD_DATA_ATTR}="${INSIGHTS_ADD_DECK_CARD_DATA_ATTR_VALUE}"`,
        );
        expect(html).toContain(`${INSIGHTS_CARD_NAME_DATA_ATTR}="Dark Magician"`);
        expect(html).toContain(`${INSIGHTS_SECTION_DATA_ATTR}="main"`);
        expect(html).toContain(`class="${SUGGESTIONS_MAIN_MATCH_THUMB_CLASS}"`);
        expect(html).toContain('width="44"');
        expect(html).toContain('height="64"');
        expect(html).toContain('loading="lazy"');
        expect(html).toContain(`${INSIGHTS_MATCH_THUMB_DATA_ATTR}`);
    });

    it('sans image : placeholder ? et quantité si > 1', () => {
        const cards: MatchingCardPreview[] = [{ name: 'X', quantity: 3, section: 'side', imageUrl: '' }];
        const html = insightsMainMatchChipsHtml(cards);
        expect(html).toContain(`${INSIGHTS_SECTION_DATA_ATTR}="side"`);
        expect(html).toContain(`>${INSIGHTS_MAIN_MATCH_THUMB_PLACEHOLDER_TEXT}<`);
        expect(html).toContain(TEXT_MULTIPLICATION_SIGN);
        expect(html).toContain('3 exemplaires');
    });
});
