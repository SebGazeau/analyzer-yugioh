import { describe, expect, it } from 'vitest';
import {
    ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_GROUP_SIZE,
    ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_NAME_WORD_CITATION_MATCHES,
    ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH,
} from '../../associations/associationsReportLimits.js';

describe('associationsReportLimits', () => {
    it('expose les plafonds par défaut du build rapport', () => {
        expect(ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_GROUP_SIZE).toBe(200);
        expect(ASSOCIATION_BUILD_REPORT_DEFAULT_MAX_NAME_WORD_CITATION_MATCHES).toBe(48);
        expect(ASSOCIATION_BUILD_REPORT_DEFAULT_MIN_NAME_WORD_LENGTH).toBe(5);
    });
});
