import { describe, expect, it } from 'vitest';
import { archetypeSourceUi } from '../../associations/archetypeSourceUi.js';

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
});
