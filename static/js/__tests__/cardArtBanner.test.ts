import { describe, expect, it } from 'vitest';
import {
    buildCardArtBannerHtml,
    CARD_ART_BANNER_CLASS,
    CARD_ART_BANNER_CLIP_CLASS,
    CARD_ART_BANNER_IMG_CLASS,
    CARD_ART_BANNER_PLACEHOLDER_CLASS,
    cardArtBannerFrameHintFromType,
} from '../components/cardArtBanner.js';

describe('cardArtBanner', () => {
    it('buildCardArtBannerHtml wraps img with expected structure', () => {
        const html = buildCardArtBannerHtml('https://example.com/c.png', { alt: 'X', loading: 'eager' });
        expect(html).toContain(CARD_ART_BANNER_CLASS);
        expect(html).toContain(CARD_ART_BANNER_CLIP_CLASS);
        expect(html).toContain(CARD_ART_BANNER_IMG_CLASS);
        expect(html).toContain('src="https://example.com/c.png"');
        expect(html).toContain('alt="X"');
        expect(html).toContain('loading="eager"');
    });

    it('buildCardArtBannerHtml uses placeholder when url empty', () => {
        const html = buildCardArtBannerHtml('  ');
        expect(html).toContain(CARD_ART_BANNER_PLACEHOLDER_CLASS);
        expect(html).not.toContain(CARD_ART_BANNER_IMG_CLASS);
    });

    it('applies variant and frame modifier classes', () => {
        const html = buildCardArtBannerHtml('https://x/y.webp', {
            variant: 'hero',
            frameHint: 'spell',
            rootClassExtra: 'my-extra',
        });
        expect(html).toContain(`${CARD_ART_BANNER_CLASS}--hero`);
        expect(html).toContain(`${CARD_ART_BANNER_CLASS}--spell`);
        expect(html).toContain('my-extra');
    });

    it('cardArtBannerFrameHintFromType maps spell/trap', () => {
        expect(cardArtBannerFrameHintFromType('Spell Card')).toBe('spell');
        expect(cardArtBannerFrameHintFromType('Trap Card')).toBe('trap');
        expect(cardArtBannerFrameHintFromType('Effect Monster')).toBe('monster');
    });
});
