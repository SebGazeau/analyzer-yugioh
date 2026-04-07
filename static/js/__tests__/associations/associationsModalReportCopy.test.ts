import { describe, expect, it } from 'vitest';
import {
    ASSOCIATIONS_MODAL_REPORT_COPY_MARKDOWN_BTN_LABEL,
    ASSOCIATIONS_MODAL_REPORT_EMPTY_TITLE,
    associationsModalReportArchetypeLineJoined,
    associationsModalReportEmptyArchetypeDisplay,
    associationsModalReportExpandTilesAriaLabel,
    associationsModalReportExpandTilesButtonCaption,
} from '../../associations/associationsModalReportCopy.js';
import { TEXT_ELLIPSIS, TEXT_EM_DASH, TEXT_MIDDLE_DOT } from '../../utils/textPlaceholders.js';

describe('associationsModalReportCopy', () => {
    it('join archétypes avec point médian', () => {
        expect(associationsModalReportArchetypeLineJoined(['A', 'B'])).toBe(`A ${TEXT_MIDDLE_DOT} B`);
    });

    it('ligne archétype vide commence par tiret cadratin', () => {
        expect(associationsModalReportEmptyArchetypeDisplay().startsWith(TEXT_EM_DASH)).toBe(true);
    });

    it('bouton expansion tuiles : aria + légende', () => {
        expect(associationsModalReportExpandTilesAriaLabel(1)).toContain('1 carte');
        expect(associationsModalReportExpandTilesAriaLabel(2)).toContain('2 cartes');
        expect(associationsModalReportExpandTilesButtonCaption(3)).toContain(TEXT_ELLIPSIS);
    });

    it('libellés footer / état vide stables', () => {
        expect(ASSOCIATIONS_MODAL_REPORT_EMPTY_TITLE.length).toBeGreaterThan(5);
        expect(ASSOCIATIONS_MODAL_REPORT_COPY_MARKDOWN_BTN_LABEL).toContain('Markdown');
    });
});
