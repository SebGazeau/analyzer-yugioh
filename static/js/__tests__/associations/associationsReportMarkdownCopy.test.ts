import { describe, expect, it } from 'vitest';
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
} from '../../associations/associationsReportMarkdownCopy.js';
import { TEXT_ELLIPSIS, TEXT_EM_DASH } from '../../utils/textPlaceholders.js';

describe('associationsReportMarkdownCopy', () => {
    it('lignes d’en-tête et groupe', () => {
        expect(associationMarkdownTitleLine('Dark Magician', 42)).toContain('Dark Magician');
        expect(associationMarkdownTitleLine('Dark Magician', 42)).toContain('42');
        expect(associationMarkdownTitleLine('Dark Magician', 42)).toContain(TEXT_EM_DASH);
        expect(associationMarkdownGeneratedLine('2020-01-01')).toContain('2020-01-01');
        expect(ASSOCIATION_MARKDOWN_EMPTY_GROUPS_LINE).toContain('Aucun groupe');
        expect(ASSOCIATION_MARKDOWN_DIAGNOSTICS_HEADING).toBe('## Diagnostics');
        expect(associationMarkdownGroupAngleLinkLine('x', 'member')).toContain('Angle');
        expect(associationMarkdownGroupAngleLinkLine('x', 'member')).toContain('Lien');
        expect(associationMarkdownGroupCardCountLine(3)).toContain('3');
        expect(associationMarkdownGroupHeading('Mon groupe')).toBe('## Mon groupe');
        expect(associationMarkdownCardBulletLine('Dark Magician', 123)).toBe('  - Dark Magician (`123`)');
        expect(associationMarkdownMoreCardsLine(5)).toContain(TEXT_ELLIPSIS);
        expect(associationMarkdownMoreCardsLine(5)).toContain('+5 autres');
        expect(associationMarkdownDiagnosticLine('info', 'CODE', 'msg')).toContain('[info]');
        expect(associationMarkdownDiagnosticLine('info', 'CODE', 'msg')).toContain('msg');
    });
});
