import { describe, expect, it } from 'vitest';
import {
    ASSOCIATION_DIAGNOSTIC_EMPTY_CATALOG_MESSAGE,
    associationDiagnosticAnchorNameInDescTruncatedMessage,
    associationDiagnosticNoArchetypeOnAnchorMessage,
    associationDiagnosticYgorgEffectEnCountMessage,
} from '../../associations/associationsReportDiagnosticsCopy.js';
import { TEXT_GUILLEMET_OPEN } from '../../utils/textPlaceholders.js';

describe('associationsReportDiagnosticsCopy', () => {
    it('messages stables ou paramétrés', () => {
        expect(ASSOCIATION_DIAGNOSTIC_EMPTY_CATALOG_MESSAGE).toContain('Catalogue vide');
        expect(associationDiagnosticYgorgEffectEnCountMessage(3)).toContain('3');
        expect(associationDiagnosticYgorgEffectEnCountMessage(3)).toContain('YGResources');
        expect(associationDiagnosticNoArchetypeOnAnchorMessage()).toContain(TEXT_GUILLEMET_OPEN);
        expect(associationDiagnosticNoArchetypeOnAnchorMessage()).toContain('même archétype');
        expect(associationDiagnosticAnchorNameInDescTruncatedMessage(99)).toContain('\u2019');
        expect(associationDiagnosticAnchorNameInDescTruncatedMessage(99)).toContain('99');
    });
});
