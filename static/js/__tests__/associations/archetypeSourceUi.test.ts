import { describe, expect, it } from 'vitest';
import { archetypeSourceUi } from '../../associations/archetypeSourceUi.js';
import { TEXT_ELLIPSIS } from '../../utils/textPlaceholders.js';

describe('archetypeSourceUi', () => {
    it('ygorg_effect_en → libellé court YGOrg', () => {
        const u = archetypeSourceUi('ygorg_effect_en');
        expect(u.short).toBe('YGOrg');
        expect(u.title.length).toBeGreaterThan(10);
    });

    it('code inconnu : titre reprend la valeur', () => {
        const u = archetypeSourceUi('custom_source');
        expect(u.short).toBe('custom_source');
        expect(u.title).toContain('custom_source');
    });

    it('code inconnu long : troncature + points de suspension', () => {
        const u = archetypeSourceUi('abcdefghijklmnop');
        expect(u.short.endsWith(TEXT_ELLIPSIS)).toBe(true);
        expect(u.short).toContain('abcd');
    });
});
