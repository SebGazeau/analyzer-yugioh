/**
 * Libellés affichés dans les tableaux onglet Suggestions (résumé insights).
 */

export const INSIGHTS_TABLE_SEVERITY_ACTIVE_LABEL = 'Actif';

export const INSIGHTS_TABLE_SEVERITY_INFO_LABEL = 'Info';

export const INSIGHTS_TABLE_KIND_SEVENTH_TACHYON_LABEL = 'Seventh Tachyon';

export function insightsTableSeverityLabel(sev: string): string {
    return sev === 'active' ? INSIGHTS_TABLE_SEVERITY_ACTIVE_LABEL : INSIGHTS_TABLE_SEVERITY_INFO_LABEL;
}

export function insightsTableKindLabel(kind: string): string {
    if (kind === 'seventh_tachyon') return INSIGHTS_TABLE_KIND_SEVENTH_TACHYON_LABEL;
    return kind;
}
