import { parseArchetypesFromField } from './archetype.js';
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
        groupKey: 'blue_eyes',
        displayLabel: 'Citation texte : Yeux Bleus / Blue-Eyes',
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
            code: 'EMPTY_CATALOG',
            message: 'Catalogue vide : impossible de calculer des associations.',
            severity: 'warn',
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
            code: 'YGORG_EFFECT_EN_AVAILABLE',
            message: `${nYgorgFx} carte(s) ont du texte YGResources (effet / pendule / flavor / link / nom EN) en complément de desc pour les citations.`,
            severity: 'info',
        });
    }

    const anchorArchetypes = parseArchetypesFromField(anchor.archetype ?? undefined);
    if (anchorArchetypes.length === 0) {
        pushDiagnostic(diagnostics, {
            code: 'NO_ARCHETYPE_ON_ANCHOR',
            message: "L'ancre n'a pas d'archétype structuré : l'angle « même archétype » est ignoré.",
            severity: 'info',
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
                    code: 'LARGE_GROUP_TRUNCATED',
                    message: `Groupe archétype « ${arch} » tronqué : ${unique.length} cartes (affichage max ${maxGroupSize}).`,
                    severity: 'info',
                });
            }
            if (cardIds.length > 0) {
                groups.push({
                    angleId: 'structured_archetype',
                    groupKey: `archetype:${arch}`,
                    displayLabel: `Même archétype : ${arch}`,
                    linkStrength: 'member',
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
                code: 'LARGE_GROUP_TRUNCATED',
                message: `Groupe Q&A YGOrg tronqué : ${qaCardIds.length} cartes (max ${maxGroupSize}).`,
                severity: 'info',
            });
        }
        groups.push({
            angleId: 'ygorg_official_qa',
            groupKey: 'ygorg_shared_qa',
            displayLabel: 'Même réponse Q&A (base YGResources)',
            linkStrength: 'reference',
            cardIds,
            meta: { source: 'ygorg_qa_entries' },
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
            code: 'NO_DESC_IN_CATALOG',
            message:
                'Aucune description utilisable (`desc` ou textes EN YGOrg) : angles « citation texte » ignorés.',
            severity: 'info',
        });
    } else {
        for (const rule of textMentionRules) {
            const matching: number[] = [];
            const useWordBoundary =
                useWordBoundaryForNameWords && rule.groupKey.startsWith('text_name:');
            for (const c of catalog) {
                if (c.id === anchor.id) continue;
                const d = associationCitableText(c).toLowerCase();
                if (!d.trim()) continue;
                const hit = rule.patterns.some((p) => patternMatchesInCitableText(d, p, useWordBoundary));
                if (hit) matching.push(c.id);
            }
            const unique = [...new Set(matching)];
            if (rule.groupKey.startsWith('text_name:') && unique.length > maxNameWordCitationMatches) {
                pushDiagnostic(diagnostics, {
                    code: 'NAME_WORD_CITATION_SKIPPED_TOO_BROAD',
                    message: `« ${rule.displayLabel} » ignoré : ${unique.length} cartes (plafond ${maxNameWordCitationMatches} pour un mot extrait du nom).`,
                    severity: 'info',
                });
                continue;
            }
            let cardIds = unique;
            if (unique.length > maxGroupSize) {
                cardIds = unique.slice(0, maxGroupSize);
                pushDiagnostic(diagnostics, {
                    code: 'LARGE_GROUP_TRUNCATED',
                    message: `Groupe « ${rule.displayLabel} » tronqué (${unique.length} cartes).`,
                    severity: 'info',
                });
            }
            if (cardIds.length > 0) {
                groups.push({
                    angleId: 'text_mention',
                    groupKey: rule.groupKey,
                    displayLabel: rule.displayLabel,
                    linkStrength: 'reference',
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
                        code: 'LARGE_GROUP_TRUNCATED',
                        message: `Groupe « nom de l’ancre dans le texte » tronqué (${unique.length} cartes).`,
                        severity: 'info',
                    });
                }
                if (cardIds.length > 0) {
                    groups.push({
                        angleId: 'text_mentions_anchor_name',
                        groupKey: 'anchor_name_in_desc',
                        displayLabel: `Texte citant « ${primary} »`,
                        linkStrength: 'reference',
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
        reasons.push('Au moins un groupe non vide.');
        return { ok: true, reasons };
    }
    const hasExplain = report.diagnostics.some(
        (d) =>
            d.code === 'NO_ARCHETYPE_ON_ANCHOR' ||
            d.code === 'EMPTY_CATALOG' ||
            d.code === 'NO_DESC_IN_CATALOG' ||
            d.code === 'YGORG_EFFECT_EN_AVAILABLE' ||
            d.code === 'NAME_WORD_CITATION_SKIPPED_TOO_BROAD',
    );
    if (hasExplain) {
        reasons.push('Aucun lien trouvé mais des diagnostics expliquent pourquoi.');
        return { ok: true, reasons };
    }
    reasons.push('Aucun groupe et pas de diagnostic explicatif (résultat peu concluant).');
    return { ok: false, reasons };
}

export function associationReportToMarkdown(report: AssociationReport, nameById?: Map<number, string>): string {
    const lines: string[] = [];
    lines.push(`# Cartes associées — ${report.anchorName} (id ${report.anchorId})`);
    lines.push(`_Généré : ${report.generatedAt}_`);
    lines.push('');
    if (report.groups.length === 0) {
        lines.push('_Aucun groupe._');
    } else {
        for (const g of report.groups) {
            lines.push(`## ${g.displayLabel}`);
            lines.push(`- **Angle** : \`${g.angleId}\` · **Lien** : ${g.linkStrength}`);
            lines.push(`- **Cartes** : ${g.cardIds.length}`);
            const sample = g.cardIds.slice(0, 15);
            for (const id of sample) {
                const label = nameById?.get(id) ?? String(id);
                lines.push(`  - ${label} (\`${id}\`)`);
            }
            if (g.cardIds.length > sample.length) lines.push(`  - … +${g.cardIds.length - sample.length} autres`);
            lines.push('');
        }
    }
    if (report.diagnostics.length > 0) {
        lines.push('## Diagnostics');
        for (const d of report.diagnostics) {
            lines.push(`- **[${d.severity}]** \`${d.code}\` — ${d.message}`);
        }
    }
    return lines.join('\n');
}
