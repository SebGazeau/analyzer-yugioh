/**
 * DOM : tableau Analysis (engines, catégories, groupes), hero probas, bandeaux catégories.
 */

import {
    ANALYSIS_CATEGORY_SUMMARY_SECTION_CATEGORIES,
    ANALYSIS_CATEGORY_SUMMARY_SECTION_ENGINES,
    ANALYSIS_CATEGORY_SUMMARY_SECTION_GROUPS,
} from './analysisCategorySummaryCopy.js';
import {
    analysisCategorySummaryDotClass,
    analysisCategorySummaryTableDataRowInnerHtml,
    analysisSectionHeaderRowInnerHtml,
    builderCategoryListRowInnerHtml,
} from './analysisCategorySummaryTableHtml.js';
import {
    ANALYSIS_SECTION_HEADER_ROW_CLASS,
    ANALYSIS_TABLE_SECTION_CATEGORIES,
    ANALYSIS_TABLE_SECTION_ENGINES,
    ANALYSIS_TABLE_SECTION_GROUPES,
    DATA_ANALYSIS_TABLE_SECTION_ATTR,
    DATA_SECTION_HEADER_ATTR,
} from './analysisTableDomSelectors.js';
import {
    BUILDER_CATEGORY_LIST_ROW_CLASS,
    analysisHeroGroupReferenceLabel,
    builderCategorySortRowTitle,
    categoryCompositionSegmentTooltip,
    DATA_CATEGORY_ATTR,
    DECK_COMPOSITION_SEGMENT_CLASS,
    DECK_STATS_CATEGORY_SEGMENT_CLASS,
} from './analysisCategorySummaryDomSelectors.js';
import { DATA_BUILDER_SORT_CATEGORY_ATTR } from '../deck-builder/builderDomSelectors.js';
import {
    ANALYSIS_HERO_ENGINE_ID,
    ANALYSIS_HERO_FIRST_ID,
    ANALYSIS_HERO_GROUP_ID,
    ANALYSIS_HERO_SECOND_ID,
    BUILDER_CATEGORY_LIST_ID,
    BUILDER_STATS_ENGINE_ID,
    BUILDER_STATS_FIRST_ID,
    BUILDER_STATS_SECOND_ID,
    DECK_COMPOSITION_STRIP_ID,
    DECK_STATS_CATEGORY_BAR_ID,
} from './analysisDomIds.js';
import { CATEGORY_SUMMARY_BODY_ELEMENT_ID } from './builderShellDomIds.js';
import { CATEGORY_GROUPS } from '../categoryData.js';
import { ARIA_EXPANDED_ATTR } from '../utils/ariaAttrs.js';
import { STYLE_CURSOR_POINTER } from '../utils/cssInlineCursor.js';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';
import { cssLengthPercent } from '../utils/cssInlineLength.js';
import { escapeHtml } from '../utils/html.js';
import { ROLE_ATTR, ROLE_BUTTON, TABINDEX_ATTR, TABINDEX_ZERO, TITLE_ATTR } from '../utils/htmlAttrs.js';
import {
    categoryEntriesSorted,
    pickFirstReferenceGroup,
    type CategoryEngineSummaryMap,
} from './categorySummaryData.js';
import { updateHistogramCategorySelect } from './drawHistogramDom.js';
import { hypergeometricProbRowStrings } from './probabilityMath.js';

function addSectionHeader(tbody: HTMLElement, title: string, sectionId?: string): void {
    const tr = document.createElement('tr');
    tr.className = ANALYSIS_SECTION_HEADER_ROW_CLASS;
    if (sectionId) {
        tr.setAttribute(DATA_SECTION_HEADER_ATTR, sectionId);
        tr.setAttribute(ROLE_ATTR, ROLE_BUTTON);
        tr.setAttribute(TABINDEX_ATTR, TABINDEX_ZERO);
        tr.setAttribute(ARIA_EXPANDED_ATTR, 'true');
        tr.innerHTML = analysisSectionHeaderRowInnerHtml(title, true);
    } else {
        tr.innerHTML = analysisSectionHeaderRowInnerHtml(title, false);
    }
    tbody.appendChild(tr);
}

export interface AnalysisCategorySummaryDomInput {
    /** Bandeau simulation (première ligne) ou null. */
    simulationBanner: string | null;
    summary: CategoryEngineSummaryMap;
    engineSummary: CategoryEngineSummaryMap;
    totalCards: number;
    /** Tirages utilisés pour les colonnes du tableau (full deck ou restant). */
    numDraws: number;
    handSize: 5 | 6;
}

export function renderAnalysisCategorySummaryDom(input: AnalysisCategorySummaryDomInput): void {
    const tbody = document.getElementById(CATEGORY_SUMMARY_BODY_ELEMENT_ID);
    if (!tbody) return;

    tbody.innerHTML = '';
    const { simulationBanner, summary, engineSummary, totalCards, numDraws, handSize } = input;

    if (simulationBanner) {
        addSectionHeader(tbody, simulationBanner);
    }

    const pctDeck = (K: number) => (totalCards > 0 ? ((K / totalCards) * 100).toFixed(1) + '%' : TEXT_EM_DASH);
    let dataRowIndex = 0;

    addSectionHeader(tbody, ANALYSIS_CATEGORY_SUMMARY_SECTION_ENGINES, ANALYSIS_TABLE_SECTION_ENGINES);
    Object.entries(engineSummary)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([engineName, cardMap]) => {
            const tr = document.createElement('tr');
            tr.setAttribute(DATA_ANALYSIS_TABLE_SECTION_ATTR, ANALYSIS_TABLE_SECTION_ENGINES);
            const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
            const probs = hypergeometricProbRowStrings(K, totalCards, numDraws);
            const dotClass = analysisCategorySummaryDotClass(dataRowIndex++);
            tr.innerHTML = analysisCategorySummaryTableDataRowInnerHtml({
                dotClass,
                firstCellContentHtml: `<strong>${escapeHtml(engineName)}</strong>`,
                K,
                pctDeck: pctDeck(K),
                probs,
            });
            tbody.appendChild(tr);
        });

    addSectionHeader(tbody, ANALYSIS_CATEGORY_SUMMARY_SECTION_CATEGORIES, ANALYSIS_TABLE_SECTION_CATEGORIES);
    Object.keys(summary)
        .sort()
        .forEach((cat) => {
            const cardMap = summary[cat];
            const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
            const probs = hypergeometricProbRowStrings(K, totalCards, numDraws);
            const dotClass = analysisCategorySummaryDotClass(dataRowIndex++);
            const tr = document.createElement('tr');
            tr.setAttribute(DATA_ANALYSIS_TABLE_SECTION_ATTR, ANALYSIS_TABLE_SECTION_CATEGORIES);
            tr.innerHTML = analysisCategorySummaryTableDataRowInnerHtml({
                dotClass,
                firstCellContentHtml: escapeHtml(cat),
                K,
                pctDeck: pctDeck(K),
                probs,
            });
            tbody.appendChild(tr);
        });

    addSectionHeader(tbody, ANALYSIS_CATEGORY_SUMMARY_SECTION_GROUPS, ANALYSIS_TABLE_SECTION_GROUPES);
    Object.entries(CATEGORY_GROUPS).forEach(([groupName, includedCats]) => {
        const cardSet = new Map<string, number>();
        includedCats.forEach((cat) => {
            if (summary[cat]) {
                summary[cat].forEach((qty: number, cardName: string) => {
                    if (!cardSet.has(cardName)) cardSet.set(cardName, qty);
                });
            }
        });
        const K = Array.from(cardSet.values()).reduce((s, v) => s + v, 0);
        const probs = hypergeometricProbRowStrings(K, totalCards, numDraws);
        const dotClass = analysisCategorySummaryDotClass(dataRowIndex++);
        const tr = document.createElement('tr');
        tr.setAttribute(DATA_ANALYSIS_TABLE_SECTION_ATTR, ANALYSIS_TABLE_SECTION_GROUPES);
        tr.innerHTML = analysisCategorySummaryTableDataRowInnerHtml({
            dotClass,
            firstCellContentHtml: `<strong>${escapeHtml(groupName)}</strong>`,
            K,
            pctDeck: pctDeck(K),
            probs,
        });
        tbody.appendChild(tr);
    });

    const ref = pickFirstReferenceGroup(engineSummary, summary);
    const firstGroupName = ref?.name ?? '';
    const firstK = ref?.K ?? 0;
    const firstEl = document.getElementById(ANALYSIS_HERO_FIRST_ID);
    const secondEl = document.getElementById(ANALYSIS_HERO_SECOND_ID);
    const engineEl = document.getElementById(ANALYSIS_HERO_ENGINE_ID);
    const enginePct =
        totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, handSize)[0] : TEXT_EM_DASH;
    if (firstEl)
        firstEl.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 5)[0] : TEXT_EM_DASH;
    if (secondEl)
        secondEl.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 6)[0] : TEXT_EM_DASH;
    if (engineEl) engineEl.textContent = enginePct;
    const heroGroupEl = document.getElementById(ANALYSIS_HERO_GROUP_ID);
    if (heroGroupEl) {
        heroGroupEl.textContent =
            firstGroupName && totalCards > 0
                ? analysisHeroGroupReferenceLabel(firstGroupName, firstK, totalCards)
                : '';
    }

    const builderFirst = document.getElementById(BUILDER_STATS_FIRST_ID);
    const builderSecond = document.getElementById(BUILDER_STATS_SECOND_ID);
    const builderEngine = document.getElementById(BUILDER_STATS_ENGINE_ID);
    if (builderFirst)
        builderFirst.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 5)[0] : TEXT_EM_DASH;
    if (builderSecond)
        builderSecond.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 6)[0] : TEXT_EM_DASH;
    if (builderEngine) builderEngine.textContent = enginePct;

    updateHistogramCategorySelect(Object.keys(summary).sort());

    const entries = categoryEntriesSorted(summary);
    const sumAll = entries.reduce((s, e) => s + e.K, 0);

    const stripEl = document.getElementById(DECK_COMPOSITION_STRIP_ID);
    if (stripEl) {
        stripEl.innerHTML = '';
        if (sumAll > 0) {
            entries.forEach(({ name, K }) => {
                const pct = (K / sumAll) * 100;
                const seg = document.createElement('div');
                seg.className = DECK_COMPOSITION_SEGMENT_CLASS;
                seg.style.flexBasis = cssLengthPercent(pct);
                seg.setAttribute(TITLE_ATTR, categoryCompositionSegmentTooltip(name, K, pct));
                seg.setAttribute(DATA_CATEGORY_ATTR, name);
                stripEl.appendChild(seg);
            });
        }
    }

    const sidebarBarEl = document.getElementById(DECK_STATS_CATEGORY_BAR_ID);
    if (sidebarBarEl) {
        sidebarBarEl.innerHTML = '';
        if (sumAll > 0) {
            entries.forEach(({ name, K }) => {
                const pct = (K / sumAll) * 100;
                const seg = document.createElement('div');
                seg.className = DECK_STATS_CATEGORY_SEGMENT_CLASS;
                seg.style.flexBasis = cssLengthPercent(pct);
                seg.setAttribute(TITLE_ATTR, categoryCompositionSegmentTooltip(name, K, pct));
                seg.setAttribute(DATA_CATEGORY_ATTR, name);
                sidebarBarEl.appendChild(seg);
            });
        }
    }

    const categoryListEl = document.getElementById(BUILDER_CATEGORY_LIST_ID);
    if (categoryListEl) {
        categoryListEl.innerHTML = '';
        if (sumAll > 0) {
            entries.forEach(({ name, K }) => {
                const pct = (K / sumAll) * 100;
                const row = document.createElement('div');
                row.className = BUILDER_CATEGORY_LIST_ROW_CLASS;
                row.setAttribute(DATA_BUILDER_SORT_CATEGORY_ATTR, name);
                row.style.cursor = STYLE_CURSOR_POINTER;
                row.title = builderCategorySortRowTitle(name);
                row.innerHTML = builderCategoryListRowInnerHtml(name, K, pct);
                categoryListEl.appendChild(row);
            });
        }
    }
}

/** Vide le tbody du tableau catégories (ex. reset deck avant rechargement). */
export function clearCategorySummaryTableBody(): void {
    const tbody = document.getElementById(CATEGORY_SUMMARY_BODY_ELEMENT_ID);
    if (tbody) tbody.innerHTML = '';
}
