import { describe, expect, it } from 'vitest';
import {
    searchResultArchetypeSourceBadgeHtml,
    searchResultRowFragmentHtml,
    searchResultThumbInnerHtml,
} from '../searchResultRowHtml.js';
import {
    DATA_SEARCH_ARCHETYPE_SOURCE_ATTR,
    SEARCH_RESULT_ADD_DECK_CLASS,
    SEARCH_RESULT_BTN_ADD_DECK_CAPTION,
    SEARCH_RESULT_BTN_ADD_SIDE_CAPTION,
    SEARCH_RESULT_BTN_ASSOCIATED_CAPTION,
    SEARCH_RESULT_NAME_CLASS,
    SEARCH_RESULT_SUBTYPE_CLASS,
    SEARCH_RESULT_THUMB_IMG_CLASS,
} from '../searchDomSelectors.js';

describe('searchResultArchetypeSourceBadgeHtml', () => {
    it('vide si pas de source', () => {
        expect(searchResultArchetypeSourceBadgeHtml(undefined)).toBe('');
        expect(searchResultArchetypeSourceBadgeHtml('   ')).toBe('');
    });

    it('émet un span data-arch-source pour une source connue', () => {
        const html = searchResultArchetypeSourceBadgeHtml('ygorg_effect_en');
        expect(html).toContain(DATA_SEARCH_ARCHETYPE_SOURCE_ATTR);
        expect(html).toContain('ygorg_effect_en');
        expect(html).toContain('YGOrg');
    });
});

describe('searchResultThumbInnerHtml', () => {
    it('image si URL non vide', () => {
        const html = searchResultThumbInnerHtml('https://x/c.jpg', 'monster');
        expect(html).toContain(`class="${SEARCH_RESULT_THUMB_IMG_CLASS}"`);
        expect(html).toContain('loading="lazy"');
    });

    it('initiale S si pas d’image et sort', () => {
        const html = searchResultThumbInnerHtml(null, 'spell');
        expect(html).toContain('>S<');
    });
});

describe('searchResultRowFragmentHtml', () => {
    it('inclut les trois actions', () => {
        const html = searchResultRowFragmentHtml({
            nameHighlightedHtml: 'X',
            subtypeEscapedHtml: 'Y',
            archetypeBadgeHtml: '',
            thumbInnerHtml: '<span>t</span>',
        });
        expect(html).toContain(`class="${SEARCH_RESULT_NAME_CLASS}">X</span>`);
        expect(html).toContain(`class="${SEARCH_RESULT_SUBTYPE_CLASS}">Y</span>`);
        expect(html).toContain(SEARCH_RESULT_ADD_DECK_CLASS);
        expect(html).toContain(`>${SEARCH_RESULT_BTN_ADD_DECK_CAPTION}<`);
        expect(html).toContain(`>${SEARCH_RESULT_BTN_ADD_SIDE_CAPTION}<`);
        expect(html).toContain(SEARCH_RESULT_BTN_ASSOCIATED_CAPTION);
    });
});
