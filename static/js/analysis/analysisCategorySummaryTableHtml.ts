/**
 * HTML du tableau catégories / engines / groupes et des lignes liste builder (barres).
 */

import {
    ANALYSIS_CATEGORY_DOT_CLASS,
    ANALYSIS_CATEGORY_DOT_MODIFIER_PREFIX,
    ANALYSIS_TD_COUNT_CLASS,
    ANALYSIS_TD_PCT_CLASS,
    ANALYSIS_TD_PROB5_CLASS,
    BUILDER_CATEGORY_LIST_BAR_CLASS,
    BUILDER_CATEGORY_LIST_BAR_WRAP_CLASS,
    BUILDER_CATEGORY_LIST_COUNT_CLASS,
    BUILDER_CATEGORY_LIST_LABEL_CLASS,
} from './analysisCategorySummaryDomSelectors.js';
import {
    ANALYSIS_SECTION_HEADER_TOGGLE_CLASS,
    ANALYSIS_SECTION_HEADER_TOGGLE_TEXT,
    ANALYSIS_TABLE_BODY_COLSPAN,
} from './analysisTableDomSelectors.js';
import { ARIA_HIDDEN_ATTR } from '../utils/ariaAttrs.js';
import { cssLengthPercent } from '../utils/cssInlineLength.js';
import { escapeHtml } from '../utils/html.js';

const ANALYSIS_DOT_COLORS = [
    'zone-main',
    'zone-extra',
    'zone-side',
    'gold',
    'info',
    'success',
    'amber',
    'danger',
] as const;

export function analysisCategorySummaryDotClass(index: number): string {
    return `${ANALYSIS_CATEGORY_DOT_CLASS} ${ANALYSIS_CATEGORY_DOT_MODIFIER_PREFIX}${ANALYSIS_DOT_COLORS[index % ANALYSIS_DOT_COLORS.length]}`;
}

/** Contenu HTML d’un `<tr>` d’en-tête de section (une seule `<td>`). */
export function analysisSectionHeaderRowInnerHtml(title: string, collapsible: boolean): string {
    if (collapsible) {
        return `<td colspan="${ANALYSIS_TABLE_BODY_COLSPAN}"><span class="${ANALYSIS_SECTION_HEADER_TOGGLE_CLASS}" ${ARIA_HIDDEN_ATTR}="true">${ANALYSIS_SECTION_HEADER_TOGGLE_TEXT}</span> <strong>${escapeHtml(title)}</strong></td>`;
    }
    return `<td colspan="${ANALYSIS_TABLE_BODY_COLSPAN}"><strong>${escapeHtml(title)}</strong></td>`;
}

export type AnalysisCategorySummaryTableDataRowParams = {
    dotClass: string;
    /** HTML déjà sûr pour la cellule nom (ex. `escapeHtml(cat)` ou `<strong>…</strong>`). */
    firstCellContentHtml: string;
    K: number;
    pctDeck: string;
    probs: readonly string[];
};

/** Cellules `<td>` d’une ligne de données (sans le `<tr>`). */
export function analysisCategorySummaryTableDataRowInnerHtml(p: AnalysisCategorySummaryTableDataRowParams): string {
    const extraCols = p.probs.slice(1).map((prob) => `<td>${prob}</td>`).join('');
    return `
                    <td><span class="${p.dotClass}" ${ARIA_HIDDEN_ATTR}="true"></span>${p.firstCellContentHtml}</td>
                    <td class="${ANALYSIS_TD_COUNT_CLASS}">${p.K}</td>
                    <td class="${ANALYSIS_TD_PCT_CLASS}">${p.pctDeck}</td>
                    <td class="${ANALYSIS_TD_PROB5_CLASS}">${p.probs[0]}</td>
                    ${extraCols}
                `;
}

/** Contenu interne d’une ligne tri catégorie (builder). */
export function builderCategoryListRowInnerHtml(name: string, K: number, pct: number): string {
    return `<span class="${BUILDER_CATEGORY_LIST_LABEL_CLASS}">${escapeHtml(name)}</span><span class="${BUILDER_CATEGORY_LIST_COUNT_CLASS}">${K}</span><div class="${BUILDER_CATEGORY_LIST_BAR_WRAP_CLASS}"><div class="${BUILDER_CATEGORY_LIST_BAR_CLASS}" style="width:${cssLengthPercent(pct)}"></div></div>`;
}
