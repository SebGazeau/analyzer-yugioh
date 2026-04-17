import { describe, expect, it } from 'vitest';
import {
    INSIGHTS_TABLE_KIND_FIDRAULIS_GY_LABEL,
    INSIGHTS_TABLE_KIND_SEVENTH_TACHYON_LABEL,
    INSIGHTS_TABLE_SEVERITY_ACTIVE_LABEL,
    INSIGHTS_TABLE_SEVERITY_INFO_LABEL,
    insightsTableKindLabel,
    insightsTableSeverityLabel,
} from '../../insights/insightsPanelTableCopy.js';

describe('insightsPanelTableCopy', () => {
    it('insightsTableSeverityLabel', () => {
        expect(insightsTableSeverityLabel('active')).toBe(INSIGHTS_TABLE_SEVERITY_ACTIVE_LABEL);
        expect(insightsTableSeverityLabel('info')).toBe(INSIGHTS_TABLE_SEVERITY_INFO_LABEL);
        expect(insightsTableSeverityLabel('other')).toBe(INSIGHTS_TABLE_SEVERITY_INFO_LABEL);
    });

    it('insightsTableKindLabel', () => {
        expect(insightsTableKindLabel('seventh_tachyon')).toBe(INSIGHTS_TABLE_KIND_SEVENTH_TACHYON_LABEL);
        expect(insightsTableKindLabel('fidraulis_gy_synchro')).toBe(INSIGHTS_TABLE_KIND_FIDRAULIS_GY_LABEL);
        expect(insightsTableKindLabel('foo')).toBe('foo');
    });
});
