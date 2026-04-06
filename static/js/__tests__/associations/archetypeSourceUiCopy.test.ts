import { describe, expect, it } from 'vitest';
import {
    ARCHETYPE_SOURCE_GENERIC_TITLE_PREFIX,
    ARCHETYPE_SOURCE_YGORG_EFFECT_EN_TITLE,
    ARCHETYPE_SOURCE_YGORG_SHORT,
} from '../../associations/archetypeSourceUiCopy.js';

describe('archetypeSourceUiCopy', () => {
    it('constantes stables', () => {
        expect(ARCHETYPE_SOURCE_YGORG_SHORT).toBe('YGOrg');
        expect(ARCHETYPE_SOURCE_YGORG_EFFECT_EN_TITLE).toContain('YGResources');
        expect(ARCHETYPE_SOURCE_YGORG_EFFECT_EN_TITLE).toContain('Konami');
        expect(ARCHETYPE_SOURCE_GENERIC_TITLE_PREFIX).toBe('Provenance métadonnées archétype : ');
    });
});
