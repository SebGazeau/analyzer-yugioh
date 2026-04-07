import { describe, expect, it } from 'vitest';
import type { CompositionBreakdown } from '../analysis/compositionBreakdown.js';
import {
    COMPOSITION_BREAKDOWN_EMPTY_MONSTERS_MAIN,
    COMPOSITION_BREAKDOWN_EMPTY_SPELLS_MAIN,
    COMPOSITION_BREAKDOWN_EMPTY_TRAPS_MAIN,
    COMPOSITION_BREAKDOWN_GROUP_TITLE_ATTRIBUTE,
    COMPOSITION_BREAKDOWN_GROUP_TITLE_SUBTYPE,
} from '../analysis/compositionBreakdownCopy.js';
import { BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS } from '../analysis/compositionBreakdownDomSelectors.js';
import { buildCompositionDetailPanelsHtml } from '../analysis/compositionBreakdownHtml.js';

describe('buildCompositionDetailPanelsHtml', () => {
    it('pans vides : textes Main sans cartes', () => {
        const empty: CompositionBreakdown = {
            monsters: { byAttribute: {}, byLevel: {}, byRace: {} },
            spells: { byRace: {} },
            traps: { byRace: {} },
        };
        const { monsterDetail, spellDetail, trapDetail } = buildCompositionDetailPanelsHtml(empty);
        expect(monsterDetail).toContain(COMPOSITION_BREAKDOWN_EMPTY_MONSTERS_MAIN);
        expect(spellDetail).toContain(COMPOSITION_BREAKDOWN_EMPTY_SPELLS_MAIN);
        expect(trapDetail).toContain(COMPOSITION_BREAKDOWN_EMPTY_TRAPS_MAIN);
        expect(monsterDetail).toContain(BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS);
    });

    it('affiche groupe Attribut et pourcentages', () => {
        const b: CompositionBreakdown = {
            monsters: {
                byAttribute: { DARK: 2, LIGHT: 1 },
                byLevel: {},
                byRace: {},
            },
            spells: { byRace: {} },
            traps: { byRace: {} },
        };
        const { monsterDetail } = buildCompositionDetailPanelsHtml(b);
        expect(monsterDetail).toContain(COMPOSITION_BREAKDOWN_GROUP_TITLE_ATTRIBUTE);
        expect(monsterDetail).toContain('DARK');
        expect(monsterDetail).toMatch(/67%/);
        expect(monsterDetail).toMatch(/33%/);
    });

    it('magies : sous-type quand total > 0', () => {
        const b: CompositionBreakdown = {
            monsters: { byAttribute: {}, byLevel: {}, byRace: {} },
            spells: { byRace: { Normal: 2 } },
            traps: { byRace: {} },
        };
        const { spellDetail } = buildCompositionDetailPanelsHtml(b);
        expect(spellDetail).toContain(COMPOSITION_BREAKDOWN_GROUP_TITLE_SUBTYPE);
        expect(spellDetail).toContain('Normal');
    });
});
