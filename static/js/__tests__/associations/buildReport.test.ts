import { describe, expect, it } from 'vitest';
import {
    associationCitableText,
    associationCitableTextForAnchorNameMatch,
    associationReportToMarkdown,
    buildAssociationReport,
    evaluateReportConclusiveness,
    EXAMPLE_BLUE_EYES_TEXT_RULES,
    patternMatchesInCitableText,
    toAssociationCatalog,
} from '../../associations/buildReport.js';
import { TEXT_ELLIPSIS, TEXT_EM_DASH } from '../../utils/textPlaceholders.js';
import { parseArchetypesFromField } from '../../associations/archetype.js';
import { buildDynamicTextMentionRulesFromAnchor, expandPhrasePatterns } from '../../associations/dynamicTextMentions.js';
import { EXAMPLE_BLUE_EYES_TEXT_RULE_GROUP_KEY } from '../../associations/associationsReportGroupDisplayCopy.js';
import {
    ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH,
    ASSOCIATION_REPORT_MARKDOWN_CARD_ID_SAMPLE_MAX,
} from '../../associations/associationsReportLimits.js';
import {
    ASSOCIATION_DIAGNOSTIC_CODE_EMPTY_CATALOG,
    ASSOCIATION_DIAGNOSTIC_CODE_NAME_WORD_CITATION_SKIPPED_TOO_BROAD,
    ASSOCIATION_DIAGNOSTIC_CODE_YGORG_EFFECT_EN_AVAILABLE,
    ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
} from '../../associations/associationsDiagnosticCodes.js';
import {
    ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE,
    ASSOCIATION_ANGLE_TEXT_MENTION,
    ASSOCIATION_ANGLE_TEXT_MENTIONS_ANCHOR_NAME,
    ASSOCIATION_ANGLE_YGORG_OFFICIAL_QA,
    ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE,
    ASSOCIATION_GROUP_KEY_PREFIX_TEXT_ARCH,
    ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME,
    ASSOCIATION_LINK_STRENGTH_MEMBER,
    ASSOCIATION_LINK_STRENGTH_REFERENCE,
} from '../../associations/associationsReportKeys.js';
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
        expect(r.diagnostics.some((d) => d.code === ASSOCIATION_DIAGNOSTIC_CODE_EMPTY_CATALOG)).toBe(true);
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
        const archGroups = r.groups.filter((g) => g.angleId === ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE);
        expect(archGroups).toHaveLength(2);
        expect(archGroups.map((g) => g.groupKey).sort()).toEqual(
            [`${ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE}Archfiend`, `${ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE}Regenesis`].sort(),
        );
        expect(
            archGroups.find((g) => g.groupKey === `${ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE}Regenesis`)?.cardIds,
        ).toEqual([2]);
        expect(
            archGroups.find((g) => g.groupKey === `${ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE}Archfiend`)?.cardIds,
        ).toEqual([3]);
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
        const tm = r.groups.filter(
            (g) => g.angleId === ASSOCIATION_ANGLE_TEXT_MENTION && g.groupKey === EXAMPLE_BLUE_EYES_TEXT_RULE_GROUP_KEY,
        );
        expect(tm.length).toBeGreaterThanOrEqual(1);
        expect(tm[0].cardIds).toContain(2);
        expect(tm[0].linkStrength).toBe(ASSOCIATION_LINK_STRENGTH_REFERENCE);
    });

    it('aucun groupe archetype si catalogue sans partage (diagnostic ou groupe vide)', () => {
        const anchor = card({ id: 1, name: 'A', archetype: 'UniqueArch' });
        const catalog: AssociationCatalogCard[] = [card({ id: 2, name: 'B', archetype: 'Other' })];
        const r = buildAssociationReport(anchor, catalog, {});
        expect(r.groups.filter((g) => g.angleId === ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE)).toHaveLength(0);
    });

    it('toAssociationCatalog parse JSON API', () => {
        const raw = [{ id: 10, name: 'X', archetype: 'A', desc: 'test' }];
        const c = toAssociationCatalog(raw as unknown[]);
        expect(c).toHaveLength(1);
        expect(c[0].id).toBe(10);
        expect(c[0].desc).toBe('test');
    });

    it('toAssociationCatalog lit archetype_source', () => {
        const raw = [{ id: 11, name: 'Y', archetype: 'Z', archetype_source: 'ygorg_effect_en' }];
        const c = toAssociationCatalog(raw as unknown[]);
        expect(c[0].archetype_source).toBe('ygorg_effect_en');
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
        expect(r.diagnostics.some((d) => d.code === ASSOCIATION_DIAGNOSTIC_CODE_YGORG_EFFECT_EN_AVAILABLE)).toBe(
            true,
        );
        const tm = r.groups.filter((g) => g.angleId === ASSOCIATION_ANGLE_TEXT_MENTION);
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
        expect(r.groups.filter((g) => g.angleId === ASSOCIATION_ANGLE_TEXT_MENTIONS_ANCHOR_NAME)).toHaveLength(0);
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
        const q = r.groups.find((g) => g.angleId === ASSOCIATION_ANGLE_YGORG_OFFICIAL_QA);
        expect(q?.cardIds.sort((a, b) => a - b)).toEqual([2, 3]);
        expect(q?.linkStrength).toBe(ASSOCIATION_LINK_STRENGTH_REFERENCE);
    });
});

describe('patternMatchesInCitableText', () => {
    it('mot entier (text_name) : pas de match de break dans breakthrough', () => {
        const h = 'this card has a breakthrough effect'.toLowerCase();
        expect(patternMatchesInCitableText(h, 'break', true)).toBe(false);
        expect(patternMatchesInCitableText('destroy this break target'.toLowerCase(), 'break', true)).toBe(true);
    });

    it('sans frontière : breakthrough contient break', () => {
        expect(patternMatchesInCitableText('breakthrough'.toLowerCase(), 'break', false)).toBe(true);
    });

    it('phrases avec espace restent en includes même avec frontière activée', () => {
        const h = 'add 1 blue eyes monster'.toLowerCase();
        expect(patternMatchesInCitableText(h, 'blue eyes', true)).toBe(true);
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

    it('n’utilise pas des mots du nom trop génériques (dragon, white, …)', () => {
        const anchor = card({
            id: 73819701,
            name: 'Fallen of the White Dragon',
            name_en: 'Fallen of the White Dragon',
            archetype: null,
        });
        const rules = buildDynamicTextMentionRulesFromAnchor(anchor, {
            includeNameWordPatterns: true,
            minNameWordLength: ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH,
        });
        const nameRules = rules.filter((r) => r.groupKey.startsWith(ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME));
        expect(nameRules.some((r) => r.patterns.includes('dragon'))).toBe(false);
        expect(nameRules.some((r) => r.patterns.includes('white'))).toBe(false);
        expect(nameRules.length).toBeGreaterThanOrEqual(1);
        expect(nameRules.some((r) => r.patterns.includes('fallen'))).toBe(true);
    });

    it('n’utilise pas « break » du nom (trop fréquent en PSCT)', () => {
        const anchor = card({
            id: 1,
            name: 'DoomZ Break - Diactorus',
            name_en: 'DoomZ Break - Diactorus',
            archetype: null,
        });
        const rules = buildDynamicTextMentionRulesFromAnchor(anchor, {
            includeNameWordPatterns: true,
            minNameWordLength: ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH,
        });
        const nameRules = rules.filter((r) => r.groupKey.startsWith(ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME));
        expect(nameRules.some((r) => r.patterns.includes('break'))).toBe(false);
        expect(nameRules.some((r) => r.patterns.includes('diactorus'))).toBe(true);
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
        const tm = r.groups.filter((g) => g.angleId === ASSOCIATION_ANGLE_TEXT_MENTION);
        expect(tm.some((g) => g.displayLabel.includes('Stardust'))).toBe(true);
        expect(tm.some((g) => g.cardIds.includes(2))).toBe(true);
    });

    it('omet un groupe text_name si le nombre de cartes dépasse le plafond', () => {
        const anchor = card({ id: 1, name: 'Anchor' });
        const catalog: AssociationCatalogCard[] = [
            anchor,
            ...Array.from({ length: 10 }, (_, i) =>
                card({ id: i + 2, name: `C${i}`, desc: 'effect token broadmatchtoken here' }),
            ),
        ];
        const r = buildAssociationReport(anchor, catalog, {
            dynamicTextMentions: false,
            maxNameWordCitationMatches: 5,
            textMentionRules: [
                {
                    groupKey: `${ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME}broad`,
                    displayLabel: 'Citation texte (mot du nom) : « x »',
                    patterns: ['broadmatchtoken'],
                },
            ],
        });
        expect(r.groups.filter((g) => g.angleId === ASSOCIATION_ANGLE_TEXT_MENTION)).toHaveLength(0);
        expect(
            r.diagnostics.some((d) => d.code === ASSOCIATION_DIAGNOSTIC_CODE_NAME_WORD_CITATION_SKIPPED_TOO_BROAD),
        ).toBe(true);
    });

    it('n’applique pas le plafond text_name aux règles text_arch', () => {
        const anchor = card({ id: 1, name: 'A' });
        const catalog: AssociationCatalogCard[] = [
            anchor,
            ...Array.from({ length: 10 }, (_, i) =>
                card({ id: i + 2, name: `C${i}`, desc: 'stardust spark here' }),
            ),
        ];
        const r = buildAssociationReport(anchor, catalog, {
            dynamicTextMentions: false,
            maxNameWordCitationMatches: 3,
            textMentionRules: [
                {
                    groupKey: `${ASSOCIATION_GROUP_KEY_PREFIX_TEXT_ARCH}stardust`,
                    displayLabel: 'Citation texte : Stardust',
                    patterns: ['stardust'],
                },
            ],
        });
        const g = r.groups.find((x) => x.groupKey === `${ASSOCIATION_GROUP_KEY_PREFIX_TEXT_ARCH}stardust`);
        expect(g?.cardIds.length).toBe(10);
        expect(
            r.diagnostics.some((d) => d.code === ASSOCIATION_DIAGNOSTIC_CODE_NAME_WORD_CITATION_SKIPPED_TOO_BROAD),
        ).toBe(false);
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
                    angleId: ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE,
                    groupKey: `${ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE}Z`,
                    displayLabel: 'Même archétype : Z',
                    linkStrength: ASSOCIATION_LINK_STRENGTH_MEMBER,
                    cardIds: [2, 3],
                },
            ],
            diagnostics: [{ code: 'X', message: 'y', severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO }],
        };
        const md = associationReportToMarkdown(report, new Map([[2, 'Two'], [3, 'Three']]));
        expect(md).toContain('Même archétype : Z');
        expect(md).toContain('Diagnostics');
        expect(md).toContain('Two');
        expect(md.split(TEXT_EM_DASH).length - 1).toBeGreaterThanOrEqual(2);
    });

    it('liste Markdown tronquée : ligne « +N autres » au-delà de l’échantillon', () => {
        const extra = 5;
        const cardIds = Array.from({ length: ASSOCIATION_REPORT_MARKDOWN_CARD_ID_SAMPLE_MAX + extra }, (_, i) => i + 1);
        const report = {
            anchorId: 1,
            anchorName: 'A',
            generatedAt: '2020-01-01T00:00:00.000Z',
            groups: [
                {
                    angleId: 'x',
                    groupKey: 'k',
                    displayLabel: 'G',
                    linkStrength: ASSOCIATION_LINK_STRENGTH_MEMBER,
                    cardIds,
                },
            ],
            diagnostics: [],
        };
        const nameById = new Map(cardIds.map((id) => [id, `C${id}`]));
        const md = associationReportToMarkdown(report, nameById);
        expect(md).toContain(TEXT_ELLIPSIS);
        expect(md).toContain(`+${extra} autres`);
    });
});
