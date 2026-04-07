/**
 * Façade publique « rapport associations » : textes / markdown / conclusivité ici ;
 * construction du graphe et parsing : `services/associations/buildAssociationReportCore.ts` + `reportTextMatch.ts`.
 */
import {
    ASSOCIATION_DIAGNOSTIC_CODE_EMPTY_CATALOG,
    ASSOCIATION_DIAGNOSTIC_CODE_NAME_WORD_CITATION_SKIPPED_TOO_BROAD,
    ASSOCIATION_DIAGNOSTIC_CODE_NO_ARCHETYPE_ON_ANCHOR,
    ASSOCIATION_DIAGNOSTIC_CODE_NO_DESC_IN_CATALOG,
    ASSOCIATION_DIAGNOSTIC_CODE_YGORG_EFFECT_EN_AVAILABLE,
} from './associationsDiagnosticCodes.js';
import {
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_EXPLAINED_EMPTY,
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_HAS_GROUPS,
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_INCONCLUSIVE,
} from './associationsReportConclusivenessCopy.js';
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
import { ASSOCIATION_REPORT_MARKDOWN_CARD_ID_SAMPLE_MAX } from './associationsReportLimits.js';
import type { AssociationReport } from './types.js';
export {
    associationCitableText,
    associationCitableTextForAnchorNameMatch,
    patternMatchesInCitableText,
} from '../services/associations/reportTextMatch.js';
export {
    buildAssociationReport,
    EXAMPLE_BLUE_EYES_TEXT_RULES,
    toAssociationCatalog,
} from '../services/associations/buildAssociationReportCore.js';

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
            const sample = g.cardIds.slice(0, ASSOCIATION_REPORT_MARKDOWN_CARD_ID_SAMPLE_MAX);
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
