import { describe, expect, it } from 'vitest';
import {
    ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_GROUP_SIZE,
    ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_NAME_WORD_CITATION_MATCHES,
    ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH,
    ASSOCIATION_REPORT_MARKDOWN_CARD_ID_SAMPLE_MAX,
} from '../../associations/associationsReportLimits.js';

describe('associationsReportLimits', () => {
    it('expose les plafonds par défaut du build rapport', () => {
        expect(ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_GROUP_SIZE).toBe(200);
        expect(ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_NAME_WORD_CITATION_MATCHES).toBe(48);
        expect(ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH).toBe(5);
        expect(ASSOCIATION_REPORT_MARKDOWN_CARD_ID_SAMPLE_MAX).toBe(15);
    });
});
