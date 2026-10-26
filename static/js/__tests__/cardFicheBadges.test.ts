import { describe, expect, it } from 'vitest';
import { buildCardFicheBadgesInnerHtml, CARD_FICHE_BADGE_CLASS } from '../cardFicheBadges.js';

describe('cardFicheBadges', () => {
    it('sort vide pour non-monstre', () => {
        expect(buildCardFicheBadgesInnerHtml({ type: 'Spell Card' })).toBe('');
    });

    it('monstre : niveau, attribut, stats', () => {
        const html = buildCardFicheBadgesInnerHtml({
            type: 'Normal Monster',
            level: 4,
            attribute: 'DARK',
            atk: 1800,
            def: 0,
        });
        expect(html).toContain(CARD_FICHE_BADGE_CLASS);
        expect(html).toContain('Niveau 4');
        expect(html).toContain('DARK');
        expect(html).toContain('1800 / 0');
        expect(html).not.toContain('<script>');
    });
});
