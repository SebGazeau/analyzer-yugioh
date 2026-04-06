import { parseArchetypesFromField } from './archetype.js';
import {
    ASSOCIATION_DIAGNOSTIC_CODE_EMPTY_CATALOG,
    ASSOCIATION_DIAGNOSTIC_CODE_LARGE_GROUP_TRUNCATED,
    ASSOCIATION_DIAGNOSTIC_CODE_NAME_WORD_CITATION_SKIPPED_TOO_BROAD,
    ASSOCIATION_DIAGNOSTIC_CODE_NO_ARCHETYPE_ON_ANCHOR,
    ASSOCIATION_DIAGNOSTIC_CODE_NO_DESC_IN_CATALOG,
    ASSOCIATION_DIAGNOSTIC_CODE_YGORG_EFFECT_EN_AVAILABLE,
    ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
    ASSOCIATION_DIAGNOSTIC_SEVERITY_WARN,
} from './associationsDiagnosticCodes.js';
import {
    ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE,
    ASSOCIATION_ANGLE_TEXT_MENTION,
    ASSOCIATION_ANGLE_TEXT_MENTIONS_ANCHOR_NAME,
    ASSOCIATION_ANGLE_YGORG_OFFICIAL_QA,
    ASSOCIATION_GROUP_KEY_ANCHOR_NAME_IN_DESC,
    ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE,
    ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME,
    ASSOCIATION_GROUP_KEY_YGORG_SHARED_QA,
    ASSOCIATION_LINK_STRENGTH_MEMBER,
    ASSOCIATION_LINK_STRENGTH_REFERENCE,
    ASSOCIATION_REPORT_META_SOURCE_YGORG_QA_ENTRIES,
} from './associationsReportKeys.js';
import {
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_EXPLAINED_EMPTY,
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_HAS_GROUPS,
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_INCONCLUSIVE,
} from './associationsReportConclusivenessCopy.js';
import {
    ASSOCIATION_DIAGNOSTIC_EMPTY_CATALOG_MESSAGE,
    associationDiagnosticAnchorNameInDescTruncatedMessage,
    associationDiagnosticArchetypeGroupTruncatedMessage,
    associationDiagnosticMentionGroupTruncatedMessage,
    associationDiagnosticNameWordCitationSkippedMessage,
    associationDiagnosticNoArchetypeOnAnchorMessage,
    associationDiagnosticNoDescInCatalogMessage,
    associationDiagnosticQaGroupTruncatedMessage,
    associationDiagnosticYgorgEffectEnCountMessage,
} from './associationsReportDiagnosticsCopy.js';
import {
    ASSOCIATION_GROUP_DISPLAY_YGORG_QA,
    associationGroupDisplayLabelSameArchetype,
    associationGroupDisplayLabelTextCiting,
    EXAMPLE_BLUE_EYES_TEXT_RULE_DISPLAY_LABEL,
    EXAMPLE_BLUE_EYES_TEXT_RULE_GROUP_KEY,
} from './associationsReportGroupDisplayCopy.js';
import {
    ASSOCIATION_MARKDOWN_DIAGNOSTICS_HEADING,
    ASSOCIATION_MARKDOWN_EMPTY_GROUPS_LINE,
    associationMarkdownCardBulletLine,
    associationMarkdownDiagnosticLine,
    associationMarkdownGeneratedLine,
    associationMarkdownGroupAngleLinkLine,
    associationMarkdownGroupCardCountLine,
    associationMarkdownGroupHeading,
    associationMarkdownMoreCardsLine,
    associationMarkdownTitleLine,
} from './associationsReportMarkdownCopy.js';
import { buildDynamicTextMentionRulesFromAnchor } from './dynamicTextMentions.js';
import type {
    AssociationCatalogCard,
    AssociationGroup,
    AssociationReport,
    BuildAssociationReportOptions,
    Diagnostic,
    TextMentionRule,
} from './types.js';

const DEFAULT_MAX_GROUP = 200;
/** Au-delà, les angles `text_name:*` sont ignorés (anti-bruit dynamique). */
const DEFAULT_MAX_NAME_WORD_CITATION_MATCHES = 48;

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Correspondance pour une sous-chaîne : `includes` ou mot entier ASCII (évite les sous-mots).
 * Espaces / tirets dans le motif → toujours `includes` (phrases, « blue-eyes », etc.).
 */
export function patternMatchesInCitableText(haystackLower: string, patternRaw: string, useWordBoundary: boolean): boolean {
    const p = patternRaw.toLowerCase();
    if (!p) return false;
    if (!useWordBoundary) return haystackLower.includes(p);
    if (/\s/.test(p) || p.includes('-')) return haystackLower.includes(p);
    if (p.length < 2 || /[^a-z0-9]/.test(p)) return haystackLower.includes(p);
    const re = new RegExp(`(?<![a-z0-9])${escapeRegex(p)}(?![a-z0-9])`);
    return re.test(haystackLower);
}

/**
 * Texte balayé pour les angles « citation » :
 * `desc` YGOProDeck puis blocs EN YGOrg (effet, pendule, flavor, nom officiel).
 */
export function associationCitableText(c: AssociationCatalogCard): string {
    const parts = [
        c.desc,
        c.ygorg_effect_en,
        c.ygorg_pendulum_effect_en,
        c.ygorg_flavor_en,
        c.ygorg_link_effect_en,
        c.ygorg_name_en,
    ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    return parts.join('\n\n');
}

/**
 * Même chose sans le nom officiel YGOrg : évite les faux positifs « texte cite l’ancre »
 * quand seul `ygorg_name_en` dupliquerait le titre de la carte.
 */
export function associationCitableTextForAnchorNameMatch(c: AssociationCatalogCard): string {
    const parts = [
        c.desc,
        c.ygorg_effect_en,
        c.ygorg_pendulum_effect_en,
        c.ygorg_flavor_en,
        c.ygorg_link_effect_en,
    ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    return parts.join('\n\n');
}

/**
 * Exemple de règles **fixes** multi-langue (tests ou preset manuel).
 * Le comportement par défaut utilise `buildDynamicTextMentionRulesFromAnchor`.
 */
export const EXAMPLE_BLUE_EYES_TEXT_RULES: TextMentionRule[] = [
    {
        groupKey: EXAMPLE_BLUE_EYES_TEXT_RULE_GROUP_KEY,
        displayLabel: EXAMPLE_BLUE_EYES_TEXT_RULE_DISPLAY_LABEL,
        patterns: ['blue-eyes', 'blue eyes', 'yeux bleus', '青眼'],
    },
];

function pushDiagnostic(diagnostics: Diagnostic[], d: Diagnostic): void {
    diagnostics.push(d);
}

function normalizeCatalogCard(raw: Record<string, unknown>): AssociationCatalogCard | null {
    const id = raw.id;
    if (typeof id !== 'number' && typeof id !== 'string') return null;
    const numId = typeof id === 'number' ? id : Number(id);
    if (!Number.isFinite(numId)) return null;
    const name = typeof raw.name === 'string' ? raw.name : '';
    if (!name) return null;
    const name_en = raw.name_en != null ? String(raw.name_en) : undefined;
    const archetype = raw.archetype != null ? String(raw.archetype) : null;
    const desc = raw.desc != null ? String(raw.desc) : raw.card_desc != null ? String(raw.card_desc) : null;
    const optStr = (k: string): string | null => {
        const v = raw[k];
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
    };
    return {
        id: numId,
        name,
        name_en: name_en || null,
        archetype: archetype || null,
        desc: desc || null,
        ygorg_effect_en: optStr('ygorg_effect_en'),
        ygorg_pendulum_effect_en: optStr('ygorg_pendulum_effect_en'),
        ygorg_flavor_en: optStr('ygorg_flavor_en'),
        ygorg_link_effect_en: optStr('ygorg_link_effect_en'),
        ygorg_name_en: optStr('ygorg_name_en'),
        image_url: optStr('image_url'),
        archetype_source: optStr('archetype_source'),
    };
}

export function toAssociationCatalog(rawList: unknown[]): AssociationCatalogCard[] {
    const out: AssociationCatalogCard[] = [];
    for (const item of rawList) {
        if (item && typeof item === 'object') {
            const c = normalizeCatalogCard(item as Record<string, unknown>);
            if (c) out.push(c);
        }
    }
    return out;
}

function collapseWhitespaceLower(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeAnchorNameForDescMatch(name: string): string {
    return collapseWhitespaceLower(name).replace(/["'’]/g, '');
}

export function buildAssociationReport(
    anchor: AssociationCatalogCard,
    catalog: AssociationCatalogCard[],
    options: BuildAssociationReportOptions = {},
): AssociationReport {
    const maxGroupSize = options.maxGroupSize ?? DEFAULT_MAX_GROUP;
    const maxNameWordCitationMatches = options.maxNameWordCitationMatches ?? DEFAULT_MAX_NAME_WORD_CITATION_MATCHES;
    const useWordBoundaryForNameWords = options.useWordBoundaryForNameWordPatterns !== false;
    const dynamicOn = options.dynamicTextMentions !== false;
    const textMentionRules: TextMentionRule[] = dynamicOn
        ? [
              ...buildDynamicTextMentionRulesFromAnchor(anchor, {
                  includeNameWordPatterns: options.includeNameWordPatterns ?? true,
                  minNameWordLength: options.minNameWordLength ?? 5,
              }),
              ...(options.textMentionRules ?? []),
          ]
        : [...(options.textMentionRules ?? [])];
    const includeAnchorName = options.includeAnchorNameInDesc ?? true;

    const diagnostics: Diagnostic[] = [];
    const groups: AssociationGroup[] = [];
    const generatedAt = new Date().toISOString();

    if (catalog.length === 0) {
        pushDiagnostic(diagnostics, {
            code: ASSOCIATION_DIAGNOSTIC_CODE_EMPTY_CATALOG,
            message: ASSOCIATION_DIAGNOSTIC_EMPTY_CATALOG_MESSAGE,
            severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_WARN,
        });
        return {
            anchorId: anchor.id,
            anchorName: anchor.name,
            generatedAt,
            groups: [],
            diagnostics,
        };
    }

    const nYgorgFx = catalog.filter(
        (c) =>
            (c.ygorg_effect_en ?? '').trim().length > 0 ||
            (c.ygorg_pendulum_effect_en ?? '').trim().length > 0 ||
            (c.ygorg_flavor_en ?? '').trim().length > 0 ||
            (c.ygorg_link_effect_en ?? '').trim().length > 0 ||
            (c.ygorg_name_en ?? '').trim().length > 0,
    ).length;
    if (nYgorgFx > 0) {
        pushDiagnostic(diagnostics, {
            code: ASSOCIATION_DIAGNOSTIC_CODE_YGORG_EFFECT_EN_AVAILABLE,
            message: associationDiagnosticYgorgEffectEnCountMessage(nYgorgFx),
            severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
        });
    }

    const anchorArchetypes = parseArchetypesFromField(anchor.archetype ?? undefined);
    if (anchorArchetypes.length === 0) {
        pushDiagnostic(diagnostics, {
            code: ASSOCIATION_DIAGNOSTIC_CODE_NO_ARCHETYPE_ON_ANCHOR,
            message: associationDiagnosticNoArchetypeOnAnchorMessage(),
            severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
        });
    } else {
        for (const arch of anchorArchetypes) {
            const matching: number[] = [];
            for (const c of catalog) {
                if (c.id === anchor.id) continue;
                const cats = parseArchetypesFromField(c.archetype ?? undefined);
                if (cats.some((a) => a.toLowerCase() === arch.toLowerCase())) matching.push(c.id);
            }
            const unique = [...new Set(matching)];
            let cardIds = unique;
            if (unique.length > maxGroupSize) {
                cardIds = unique.slice(0, maxGroupSize);
                pushDiagnostic(diagnostics, {
                    code: ASSOCIATION_DIAGNOSTIC_CODE_LARGE_GROUP_TRUNCATED,
                    message: associationDiagnosticArchetypeGroupTruncatedMessage(arch, unique.length, maxGroupSize),
                    severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
                });
            }
            if (cardIds.length > 0) {
                groups.push({
                    angleId: ASSOCIATION_ANGLE_STRUCTURED_ARCHETYPE,
                    groupKey: `${ASSOCIATION_GROUP_KEY_PREFIX_ARCHETYPE}${arch}`,
                    displayLabel: associationGroupDisplayLabelSameArchetype(arch),
                    linkStrength: ASSOCIATION_LINK_STRENGTH_MEMBER,
                    cardIds,
                    meta: { archetype: arch },
                });
            }
        }
    }

    const qaIdsRaw = options.ygorgQaRelatedCardIds ?? [];
    const qaCardIds = [...new Set(qaIdsRaw.map(Number).filter((id) => Number.isFinite(id) && id !== anchor.id))];
    if (qaCardIds.length > 0) {
        let cardIds = qaCardIds;
        if (qaCardIds.length > maxGroupSize) {
            cardIds = qaCardIds.slice(0, maxGroupSize);
            pushDiagnostic(diagnostics, {
                code: ASSOCIATION_DIAGNOSTIC_CODE_LARGE_GROUP_TRUNCATED,
                message: associationDiagnosticQaGroupTruncatedMessage(qaCardIds.length, maxGroupSize),
                severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
            });
        }
        groups.push({
            angleId: ASSOCIATION_ANGLE_YGORG_OFFICIAL_QA,
            groupKey: ASSOCIATION_GROUP_KEY_YGORG_SHARED_QA,
            displayLabel: ASSOCIATION_GROUP_DISPLAY_YGORG_QA,
            linkStrength: ASSOCIATION_LINK_STRENGTH_REFERENCE,
            cardIds,
            meta: { source: ASSOCIATION_REPORT_META_SOURCE_YGORG_QA_ENTRIES },
        });
    }

    let anyDesc = false;
    for (const c of catalog) {
        if (associationCitableText(c).trim().length > 0) {
            anyDesc = true;
            break;
        }
    }
    if (!anyDesc) {
        pushDiagnostic(diagnostics, {
            code: ASSOCIATION_DIAGNOSTIC_CODE_NO_DESC_IN_CATALOG,
            message: associationDiagnosticNoDescInCatalogMessage(),
            severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
        });
    } else {
        for (const rule of textMentionRules) {
            const matching: number[] = [];
            const useWordBoundary =
                useWordBoundaryForNameWords && rule.groupKey.startsWith(ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME);
            for (const c of catalog) {
                if (c.id === anchor.id) continue;
                const d = associationCitableText(c).toLowerCase();
                if (!d.trim()) continue;
                const hit = rule.patterns.some((p) => patternMatchesInCitableText(d, p, useWordBoundary));
                if (hit) matching.push(c.id);
            }
            const unique = [...new Set(matching)];
            if (
                rule.groupKey.startsWith(ASSOCIATION_GROUP_KEY_PREFIX_TEXT_NAME) &&
                unique.length > maxNameWordCitationMatches
            ) {
                pushDiagnostic(diagnostics, {
                    code: ASSOCIATION_DIAGNOSTIC_CODE_NAME_WORD_CITATION_SKIPPED_TOO_BROAD,
                    message: associationDiagnosticNameWordCitationSkippedMessage(
                        rule.displayLabel,
                        unique.length,
                        maxNameWordCitationMatches,
                    ),
                    severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
                });
                continue;
            }
            let cardIds = unique;
            if (unique.length > maxGroupSize) {
                cardIds = unique.slice(0, maxGroupSize);
                pushDiagnostic(diagnostics, {
                    code: ASSOCIATION_DIAGNOSTIC_CODE_LARGE_GROUP_TRUNCATED,
                    message: associationDiagnosticMentionGroupTruncatedMessage(rule.displayLabel, unique.length),
                    severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
                });
            }
            if (cardIds.length > 0) {
                groups.push({
                    angleId: ASSOCIATION_ANGLE_TEXT_MENTION,
                    groupKey: rule.groupKey,
                    displayLabel: rule.displayLabel,
                    linkStrength: ASSOCIATION_LINK_STRENGTH_REFERENCE,
                    cardIds,
                    meta: { mentionKey: rule.groupKey },
                });
            }
        }

        if (includeAnchorName) {
            const primary = anchor.name_en?.trim() || anchor.name;
            const norm = normalizeAnchorNameForDescMatch(primary);
            if (norm.length >= 4) {
                const matching: number[] = [];
                for (const c of catalog) {
                    if (c.id === anchor.id) continue;
                    const d = collapseWhitespaceLower(associationCitableTextForAnchorNameMatch(c));
                    if (!d) continue;
                    if (d.includes(norm)) matching.push(c.id);
                }
                const unique = [...new Set(matching)];
                let cardIds = unique;
                if (unique.length > maxGroupSize) {
                    cardIds = unique.slice(0, maxGroupSize);
                    pushDiagnostic(diagnostics, {
                        code: ASSOCIATION_DIAGNOSTIC_CODE_LARGE_GROUP_TRUNCATED,
                        message: associationDiagnosticAnchorNameInDescTruncatedMessage(unique.length),
                        severity: ASSOCIATION_DIAGNOSTIC_SEVERITY_INFO,
                    });
                }
                if (cardIds.length > 0) {
                    groups.push({
                        angleId: ASSOCIATION_ANGLE_TEXT_MENTIONS_ANCHOR_NAME,
                        groupKey: ASSOCIATION_GROUP_KEY_ANCHOR_NAME_IN_DESC,
                        displayLabel: associationGroupDisplayLabelTextCiting(primary),
                        linkStrength: ASSOCIATION_LINK_STRENGTH_REFERENCE,
                        cardIds,
                    });
                }
            }
        }
    }

    return {
        anchorId: anchor.id,
        anchorName: anchor.name,
        generatedAt,
        groups,
        diagnostics,
    };
}

export function evaluateReportConclusiveness(report: AssociationReport): { ok: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const nonEmpty = report.groups.some((g) => g.cardIds.length > 0);
    if (nonEmpty) {
        reasons.push(ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_HAS_GROUPS);
        return { ok: true, reasons };
    }
    const hasExplain = report.diagnostics.some(
        (d) =>
            d.code === ASSOCIATION_DIAGNOSTIC_CODE_NO_ARCHETYPE_ON_ANCHOR ||
            d.code === ASSOCIATION_DIAGNOSTIC_CODE_EMPTY_CATALOG ||
            d.code === ASSOCIATION_DIAGNOSTIC_CODE_NO_DESC_IN_CATALOG ||
            d.code === ASSOCIATION_DIAGNOSTIC_CODE_YGORG_EFFECT_EN_AVAILABLE ||
            d.code === ASSOCIATION_DIAGNOSTIC_CODE_NAME_WORD_CITATION_SKIPPED_TOO_BROAD,
    );
    if (hasExplain) {
        reasons.push(ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_EXPLAINED_EMPTY);
        return { ok: true, reasons };
    }
    reasons.push(ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_INCONCLUSIVE);
    return { ok: false, reasons };
}

export function associationReportToMarkdown(report: AssociationReport, nameById?: Map<number, string>): string {
    const lines: string[] = [];
    lines.push(associationMarkdownTitleLine(report.anchorName, report.anchorId));
    lines.push(associationMarkdownGeneratedLine(report.generatedAt));
    lines.push('');
    if (report.groups.length === 0) {
        lines.push(ASSOCIATION_MARKDOWN_EMPTY_GROUPS_LINE);
    } else {
        for (const g of report.groups) {
            lines.push(associationMarkdownGroupHeading(g.displayLabel));
            lines.push(associationMarkdownGroupAngleLinkLine(g.angleId, g.linkStrength));
            lines.push(associationMarkdownGroupCardCountLine(g.cardIds.length));
            const sample = g.cardIds.slice(0, 15);
            for (const id of sample) {
                const label = nameById?.get(id) ?? String(id);
                lines.push(associationMarkdownCardBulletLine(label, id));
            }
            if (g.cardIds.length > sample.length)
                lines.push(associationMarkdownMoreCardsLine(g.cardIds.length - sample.length));
            lines.push('');
        }
    }
    if (report.diagnostics.length > 0) {
        lines.push(ASSOCIATION_MARKDOWN_DIAGNOSTICS_HEADING);
        for (const d of report.diagnostics) {
            lines.push(associationMarkdownDiagnosticLine(d.severity, d.code, d.message));
        }
    }
    return lines.join('\n');
}
