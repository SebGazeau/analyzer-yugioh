import { describe, expect, it } from 'vitest';
import {
    ASSOCIATION_GROUP_DISPLAY_YGORG_QA,
    associationGroupDisplayLabelSameArchetype,
    associationGroupDisplayLabelTextCiting,
    EXAMPLE_BLUE_EYES_TEXT_RULE_DISPLAY_LABEL,
} from '../../associations/associationsReportGroupDisplayCopy.js';
import { TEXT_GUILLEMET_OPEN } from '../../utils/textPlaceholders.js';

describe('associationsReportGroupDisplayCopy', () => {
    it('libellés groupe / exemple', () => {
        expect(EXAMPLE_BLUE_EYES_TEXT_RULE_DISPLAY_LABEL).toContain('Yeux Bleus');
        expect(associationGroupDisplayLabelSameArchetype('Z')).toBe('Même archétype : Z');
        expect(ASSOCIATION_GROUP_DISPLAY_YGORG_QA).toContain('Q&A');
        expect(associationGroupDisplayLabelTextCiting('Dark Magician')).toContain('Dark Magician');
        expect(associationGroupDisplayLabelTextCiting('X')).toContain(TEXT_GUILLEMET_OPEN);
    });
});
