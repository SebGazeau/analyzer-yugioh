// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { SearchApiCard } from '../services/search/searchApiTypes.js';
import {
    applySearchCardPreviewCard,
    applySearchCardPreviewPlaceholder,
    buildSearchCardPreviewInnerHtml,
    buildSearchCardPreviewLiveText,
    SEARCH_CARD_PREVIEW_NO_DESC_TEXT,
    SEARCH_CARD_PREVIEW_PLACEHOLDER_TEXT,
} from '../searchCardPreview.js';

describe('searchCardPreview', () => {
    it('buildSearchCardPreviewLiveText résume nom et type', () => {
        const card: SearchApiCard = { name: 'Dark Magician', type: 'Normal Monster' };
        expect(buildSearchCardPreviewLiveText(card)).toBe('Dark Magician — Normal Monster');
    });

    it('buildSearchCardPreviewInnerHtml échappe le nom et injecte le texte via applySearchCardPreviewCard', () => {
        const card: SearchApiCard = {
            name: 'X<script>',
            type: 'Spell Card',
            desc: 'Effet',
            image_url: 'https://example.com/a.jpg',
        };
        const html = buildSearchCardPreviewInnerHtml(card);
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
        expect(html).toContain('search-card-preview__art-banner');
        expect(html).toContain('card-art-banner');
        expect(html).toContain('card-art-banner__img');
        expect(html).toContain('https://example.com/a.jpg');

        const inner = document.createElement('div');
        applySearchCardPreviewCard(inner, card);
        const desc = inner.querySelector('[data-search-preview-desc]');
        expect(desc?.textContent).toBe('Effet');
    });

    it('sans desc, le corps affiche le libellé de secours', () => {
        const card: SearchApiCard = { name: 'A', type: 'Trap Card' };
        const inner = document.createElement('div');
        applySearchCardPreviewCard(inner, card);
        const desc = inner.querySelector('[data-search-preview-desc]');
        expect(desc?.textContent).toBe(SEARCH_CARD_PREVIEW_NO_DESC_TEXT);
    });

    it('monstre : ligne race secondaire et badge niveau', () => {
        const card: SearchApiCard = {
            name: 'Test',
            type: 'Effect Monster',
            race: 'Dragon',
            level: 4,
            atk: 1800,
            def: 0,
        };
        const html = buildSearchCardPreviewInnerHtml(card);
        expect(html).toContain('Dragon');
        expect(html).toContain('Niveau 4');
        expect(html).toContain('1800 / 0');
    });

    it('applySearchCardPreviewPlaceholder affiche le texte d’invite échappé', () => {
        const inner = document.createElement('div');
        applySearchCardPreviewPlaceholder(inner);
        expect(inner.textContent).toContain(SEARCH_CARD_PREVIEW_PLACEHOLDER_TEXT);
        expect(inner.innerHTML).not.toContain('<script>');
    });
});
