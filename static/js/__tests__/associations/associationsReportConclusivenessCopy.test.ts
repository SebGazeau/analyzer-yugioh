import { describe, expect, it } from 'vitest';
import {
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_EXPLAINED_EMPTY,
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_HAS_GROUPS,
    ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_INCONCLUSIVE,
} from '../../associations/associationsReportConclusivenessCopy.js';

describe('associationsReportConclusivenessCopy', () => {
    it('messages non vides et distincts', () => {
        expect(ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_HAS_GROUPS.length).toBeGreaterThan(10);
        expect(ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_EXPLAINED_EMPTY).toContain('diagnostics');
        expect(ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_INCONCLUSIVE).toContain('concluant');
        expect(new Set([ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_HAS_GROUPS, ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_EXPLAINED_EMPTY, ASSOCIATION_REPORT_CONCLUSIVENESS_REASON_INCONCLUSIVE]).size).toBe(3);
    });
});
