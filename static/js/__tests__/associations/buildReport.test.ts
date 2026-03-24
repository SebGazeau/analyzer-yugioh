import { describe, expect, it } from 'vitest';
import {
    associationCitableText,
    associationCitableTextForAnchorNameMatch,
    associationReportToMarkdown,
    buildAssociationReport,
    evaluateReportConclusiveness,
    EXAMPLE_BLUE_EYES_TEXT_RULES,
    toAssociationCatalog,
} from '../../associations/buildReport.js';
import { parseArchetypesFromField } from '../../associations/archetype.js';
import { buildDynamicTextMentionRulesFromAnchor, expandPhrasePatterns } from '../../associations/dynamicTextMentions.js';
import type { AssociationCatalogCard } from '../../associations/types.js';

function card(p: Partial<AssociationCatalogCard> & Pick<AssociationCatalogCard, 'id' | 'name'>): AssociationCatalogCard {
    return {
        name_en: null,
        archetype: null,
        desc: null,
        ...p,
    };
}

describe('parseArchetypesFromField', () => {
    it('split double archétype Regenesis / Archfiend', () => {
        expect(parseArchetypesFromField('Regenesis / Archfiend')).toEqual(['Regenesis', 'Archfiend']);
    });
    it('vide si null', () => {
        expect(parseArchetypesFromField(null)).toEqual([]);
    });
});

describe('buildAssociationReport', () => {
    it('EMPTY_CATALOG si catalogue vide', () => {
        const anchor = card({ id: 1, name: 'A', archetype: 'X' });
        const r = buildAssociationReport(anchor, [], {});
        expect(r.groups).toHaveLength(0);
        expect(r.diagnostics.some((d) => d.code === 'EMPTY_CATALOG')).toBe(true);
        expect(evaluateReportConclusiveness(r).ok).toBe(true);
    });

    it('deux groupes structured_archetype pour ancre double archétype', () => {
        const anchor = card({ id: 1, name: 'Ancre', archetype: 'Regenesis / Archfiend' });
        const catalog: AssociationCatalogCard[] = [
            card({ id: 2, name: 'R1', archetype: 'Regenesis' }),
            card({ id: 3, name: 'AF1', archetype: 'Archfiend' }),
            card({ id: 4, name: 'Other', archetype: 'Lightsworn' }),
        ];
        const r = buildAssociationReport(anchor, catalog, {});
        const archGroups = r.groups.filter((g) => g.angleId === 'structured_archetype');
        expect(archGroups).toHaveLength(2);
        expect(archGroups.map((g) => g.groupKey).sort()).toEqual(['archetype:Archfiend', 'archetype:Regenesis'].sort());
        expect(archGroups.find((g) => g.groupKey === 'archetype:Regenesis')?.cardIds).toEqual([2]);
        expect(archGroups.find((g) => g.groupKey === 'archetype:Archfiend')?.cardIds).toEqual([3]);
    });

    it('text_mention : desc contenant synonyme Yeux Bleus', () => {
        const anchor = card({ id: 1, name: 'Blue-Eyes White Dragon', archetype: 'Blue-Eyes' });
        const catalog: AssociationCatalogCard[] = [
            card({
                id: 2,
                name: 'Support',
                archetype: 'Generic',
                desc: 'Add 1 Yeux Bleus monster from your Deck.',
            }),
        ];
        const r = buildAssociationReport(anchor, catalog, {
            dynamicTextMentions: false,
            textMentionRules: EXAMPLE_BLUE_EYES_TEXT_RULES,
        });
        const tm = r.groups.filter((g) => g.angleId === 'text_mention' && g.groupKey === 'blue_eyes');
        expect(tm.length).toBeGreaterThanOrEqual(1);
        expect(tm[0].cardIds).toContain(2);
        expect(tm[0].linkStrength).toBe('reference');
    });

    it('aucun groupe archetype si catalogue sans partage (diagnostic ou groupe vide)', () => {
        const anchor = card({ id: 1, name: 'A', archetype: 'UniqueArch' });
        const catalog: AssociationCatalogCard[] = [card({ id: 2, name: 'B', archetype: 'Other' })];
        const r = buildAssociationReport(anchor, catalog, {});
        expect(r.groups.filter((g) => g.angleId === 'structured_archetype')).toHaveLength(0);
    });

    it('toAssociationCatalog parse JSON API', () => {
        const raw = [{ id: 10, name: 'X', archetype: 'A', desc: 'test' }];
        const c = toAssociationCatalog(raw as unknown[]);
        expect(c).toHaveLength(1);
        expect(c[0].id).toBe(10);
        expect(c[0].desc).toBe('test');
    });

    it('citation texte : matche ygorg_effect_en si desc vide', () => {
        const anchor = card({ id: 1, name: 'Stardust Dragon', archetype: 'Stardust' });
        const catalog: AssociationCatalogCard[] = [
            card({
                id: 2,
                name: 'Other',
                archetype: 'Generic',
                desc: null,
                ygorg_effect_en: 'Add 1 Stardust monster from your Deck.',
            }),
        ];
        expect(associationCitableText(catalog[0])).toContain('Stardust');
        const r = buildAssociationReport(anchor, catalog, { includeNameWordPatterns: false });
        expect(r.diagnostics.some((d) => d.code === 'YGORG_EFFECT_EN_AVAILABLE')).toBe(true);
        const tm = r.groups.filter((g) => g.angleId === 'text_mention');
        expect(tm.some((g) => g.cardIds.includes(2))).toBe(true);
    });

    it('associationCitableText concatène pendule / flavor / link / nom YGOrg', () => {
        const c = card({
            id: 1,
            name: 'X',
            desc: 'alpha',
            ygorg_effect_en: 'beta',
            ygorg_pendulum_effect_en: 'gamma',
            ygorg_flavor_en: 'delta',
            ygorg_link_effect_en: 'linkfx',
            ygorg_name_en: 'Official Name',
        });
        const t = associationCitableText(c);
        expect(t).toContain('alpha');
        expect(t).toContain('beta');
        expect(t).toContain('gamma');
        expect(t).toContain('delta');
        expect(t).toContain('linkfx');
        expect(t).toContain('Official Name');
        const t2 = associationCitableTextForAnchorNameMatch(c);
        expect(t2).toContain('linkfx');
        expect(t2).not.toContain('Official Name');
    });

    it('citation nom ancre : ignore ygorg_name_en seul (évite faux positifs)', () => {
        const anchor = card({ id: 1, name: 'Gem-Knight Seraphinite', archetype: 'Gem-Knight' });
        const catalog: AssociationCatalogCard[] = [
            card({
                id: 2,
                name: 'Other',
                archetype: 'Z',
                desc: null,
                ygorg_name_en: 'Gem-Knight Seraphinite',
            }),
        ];
        const r = buildAssociationReport(anchor, catalog, {
            dynamicTextMentions: false,
            includeAnchorNameInDesc: true,
        });
        expect(r.groups.filter((g) => g.angleId === 'text_mentions_anchor_name')).toHaveLength(0);
    });

    it('groupe ygorg_official_qa depuis ygorgQaRelatedCardIds', () => {
        const anchor = card({ id: 1, name: 'A', archetype: 'X' });
        const catalog: AssociationCatalogCard[] = [
            anchor,
            card({ id: 2, name: 'B', archetype: 'Y' }),
            card({ id: 3, name: 'C', archetype: 'Z' }),
        ];
        const r = buildAssociationReport(anchor, catalog, {
            dynamicTextMentions: false,
            ygorgQaRelatedCardIds: [2, 3],
        });
        const q = r.groups.find((g) => g.angleId === 'ygorg_official_qa');
        expect(q?.cardIds.sort((a, b) => a - b)).toEqual([2, 3]);
        expect(q?.linkStrength).toBe('reference');
    });
});

describe('buildDynamicTextMentionRulesFromAnchor', () => {
    it('produit une règle par archétype parsé', () => {
        const anchor = card({ id: 1, name: 'X', archetype: 'Foo / Bar' });
        const rules = buildDynamicTextMentionRulesFromAnchor(anchor, { includeNameWordPatterns: false });
        expect(rules.length).toBe(2);
        expect(rules.map((r) => r.displayLabel)).toContain('Citation texte : Foo');
        expect(rules.map((r) => r.displayLabel)).toContain('Citation texte : Bar');
    });

    it('intègre le rapport : desc qui cite un archétype de l’ancre', () => {
        const anchor = card({ id: 1, name: 'A', archetype: 'Stardust' });
        const catalog: AssociationCatalogCard[] = [
            card({
                id: 2,
                name: 'Support',
                archetype: 'Generic',
                desc: 'Add 1 Stardust monster from your Deck.',
            }),
        ];
        const r = buildAssociationReport(anchor, catalog, { includeNameWordPatterns: false });
        const tm = r.groups.filter((g) => g.angleId === 'text_mention');
        expect(tm.some((g) => g.displayLabel.includes('Stardust'))).toBe(true);
        expect(tm.some((g) => g.cardIds.includes(2))).toBe(true);
    });
});

describe('expandPhrasePatterns', () => {
    it('ajoute variante espace pour tiret', () => {
        const p = expandPhrasePatterns('Blue-Eyes');
        expect(p).toContain('blue-eyes');
        expect(p).toContain('blue eyes');
    });
});

describe('associationReportToMarkdown', () => {
    it('contient titres et diagnostics', () => {
        const report = {
            anchorId: 1,
            anchorName: 'Test',
            generatedAt: '2020-01-01T00:00:00.000Z',
            groups: [
                {
                    angleId: 'structured_archetype',
                    groupKey: 'archetype:Z',
                    displayLabel: 'Même archétype : Z',
                    linkStrength: 'member' as const,
                    cardIds: [2, 3],
                },
            ],
            diagnostics: [{ code: 'X', message: 'y', severity: 'info' as const }],
        };
        const md = associationReportToMarkdown(report, new Map([[2, 'Two'], [3, 'Three']]));
        expect(md).toContain('Même archétype : Z');
        expect(md).toContain('Diagnostics');
        expect(md).toContain('Two');
    });
});
