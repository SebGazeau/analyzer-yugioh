/**
 * Libellés Markdown export rapport associations (copie presse-papiers).
 */

import { TEXT_ELLIPSIS, TEXT_EM_DASH, TEXT_MIDDLE_DOT } from '../utils/textPlaceholders.js';

export function associationMarkdownTitleLine(anchorName: string, anchorId: number): string {
    return `# Cartes associées ${TEXT_EM_DASH} ${anchorName} (id ${anchorId})`;
}

export function associationMarkdownGeneratedLine(generatedAt: string): string {
    return `_Généré : ${generatedAt}_`;
}

export const ASSOCIATION_MARKDOWN_EMPTY_GROUPS_LINE = '_Aucun groupe._';

export const ASSOCIATION_MARKDOWN_DIAGNOSTICS_HEADING = '## Diagnostics';

export function associationMarkdownGroupAngleLinkLine(angleId: string, linkStrength: string): string {
    return `- **Angle** : \`${angleId}\` ${TEXT_MIDDLE_DOT} **Lien** : ${linkStrength}`;
}

export function associationMarkdownGroupCardCountLine(cardCount: number): string {
    return `- **Cartes** : ${cardCount}`;
}

export function associationMarkdownMoreCardsLine(extraCount: number): string {
    return `  - ${TEXT_ELLIPSIS} +${extraCount} autres`;
}

export function associationMarkdownDiagnosticLine(severity: string, code: string, message: string): string {
    return `- **[${severity}]** \`${code}\` ${TEXT_EM_DASH} ${message}`;
}
