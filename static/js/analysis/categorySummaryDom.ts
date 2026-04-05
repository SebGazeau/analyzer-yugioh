/**
 * DOM : tableau Analysis (engines, catégories, groupes), hero probas, bandeaux catégories.
 */

import {
    ANALYSIS_SECTION_HEADER_ROW_CLASS,
    ANALYSIS_SECTION_HEADER_TOGGLE_CLASS,
    ANALYSIS_TABLE_SECTION_CATEGORIES,
    ANALYSIS_TABLE_SECTION_ENGINES,
    ANALYSIS_TABLE_SECTION_GROUPES,
    DATA_ANALYSIS_TABLE_SECTION_ATTR,
    DATA_SECTION_HEADER_ATTR,
} from './analysisTableDomSelectors.js';
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
    BUILDER_CATEGORY_LIST_ROW_CLASS,
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
import { CATEGORY_GROUPS } from '../category.js';
import { ARIA_EXPANDED_ATTR, ARIA_HIDDEN_ATTR } from '../utils/ariaAttrs.js';
import { ROLE_ATTR, ROLE_BUTTON, TABINDEX_ATTR, TABINDEX_ZERO, TITLE_ATTR } from '../utils/htmlAttrs.js';
import { escapeHtml } from '../utils/html.js';
import {
    categoryEntriesSorted,
    pickFirstReferenceGroup,
    type CategoryEngineSummaryMap,
} from './categorySummaryData.js';
import { updateHistogramCategorySelect } from './drawHistogramDom.js';
import { hypergeometricProbRowStrings } from './probabilityMath.js';

const ANALYSIS_DOT_COLORS = [
    'zone-main',
    'zone-extra',
    'zone-side',
    'gold',
    'info',
    'success',
    'amber',
    'danger',
];

function addSectionHeader(tbody: HTMLElement, title: string, sectionId?: string): void {
    const tr = document.createElement('tr');
    tr.className = ANALYSIS_SECTION_HEADER_ROW_CLASS;
    if (sectionId) {
        tr.setAttribute(DATA_SECTION_HEADER_ATTR, sectionId);
        tr.setAttribute(ROLE_ATTR, ROLE_BUTTON);
        tr.setAttribute(TABINDEX_ATTR, TABINDEX_ZERO);
        tr.setAttribute(ARIA_EXPANDED_ATTR, 'true');
        tr.innerHTML = `<td colspan="9"><span class="${ANALYSIS_SECTION_HEADER_TOGGLE_CLASS}" ${ARIA_HIDDEN_ATTR}="true">▼</span> <strong>${escapeHtml(title)}</strong></td>`;
    } else {
        tr.innerHTML = `<td colspan="9"><strong>${escapeHtml(title)}</strong></td>`;
    }
    tbody.appendChild(tr);
}

function analysisCategoryDotClass(index: number): string {
    return `${ANALYSIS_CATEGORY_DOT_CLASS} ${ANALYSIS_CATEGORY_DOT_MODIFIER_PREFIX}${ANALYSIS_DOT_COLORS[index % ANALYSIS_DOT_COLORS.length]}`;
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

    const pctDeck = (K: number) => (totalCards > 0 ? ((K / totalCards) * 100).toFixed(1) + '%' : '—');
    let dataRowIndex = 0;

    addSectionHeader(tbody, 'Engines', ANALYSIS_TABLE_SECTION_ENGINES);
    Object.entries(engineSummary)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([engineName, cardMap]) => {
            const tr = document.createElement('tr');
            tr.setAttribute(DATA_ANALYSIS_TABLE_SECTION_ATTR, ANALYSIS_TABLE_SECTION_ENGINES);
            const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
            const probs = hypergeometricProbRowStrings(K, totalCards, numDraws);
            const dotClass = analysisCategoryDotClass(dataRowIndex++);
            tr.innerHTML = `
                    <td><span class="${dotClass}" ${ARIA_HIDDEN_ATTR}="true"></span><strong>${escapeHtml(engineName)}</strong></td>
                    <td class="${ANALYSIS_TD_COUNT_CLASS}">${K}</td>
                    <td class="${ANALYSIS_TD_PCT_CLASS}">${pctDeck(K)}</td>
                    <td class="${ANALYSIS_TD_PROB5_CLASS}">${probs[0]}</td>
                    ${probs.slice(1).map((p) => `<td>${p}</td>`).join('')}
                `;
            tbody.appendChild(tr);
        });

    addSectionHeader(tbody, 'Catégories', ANALYSIS_TABLE_SECTION_CATEGORIES);
    Object.keys(summary)
        .sort()
        .forEach((cat) => {
            const cardMap = summary[cat];
            const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
            const probs = hypergeometricProbRowStrings(K, totalCards, numDraws);
            const dotClass = analysisCategoryDotClass(dataRowIndex++);
            const tr = document.createElement('tr');
            tr.setAttribute(DATA_ANALYSIS_TABLE_SECTION_ATTR, ANALYSIS_TABLE_SECTION_CATEGORIES);
            tr.innerHTML = `
                    <td><span class="${dotClass}" ${ARIA_HIDDEN_ATTR}="true"></span>${escapeHtml(cat)}</td>
                    <td class="${ANALYSIS_TD_COUNT_CLASS}">${K}</td>
                    <td class="${ANALYSIS_TD_PCT_CLASS}">${pctDeck(K)}</td>
                    <td class="${ANALYSIS_TD_PROB5_CLASS}">${probs[0]}</td>
                    ${probs.slice(1).map((p) => `<td>${p}</td>`).join('')}
                `;
            tbody.appendChild(tr);
        });

    addSectionHeader(tbody, 'Groupes de catégories', ANALYSIS_TABLE_SECTION_GROUPES);
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
        const dotClass = analysisCategoryDotClass(dataRowIndex++);
        const tr = document.createElement('tr');
        tr.setAttribute(DATA_ANALYSIS_TABLE_SECTION_ATTR, ANALYSIS_TABLE_SECTION_GROUPES);
        tr.innerHTML = `
                <td><span class="${dotClass}" ${ARIA_HIDDEN_ATTR}="true"></span><strong>${escapeHtml(groupName)}</strong></td>
                <td class="${ANALYSIS_TD_COUNT_CLASS}">${K}</td>
                <td class="${ANALYSIS_TD_PCT_CLASS}">${pctDeck(K)}</td>
                <td class="${ANALYSIS_TD_PROB5_CLASS}">${probs[0]}</td>
                ${probs.slice(1).map((p) => `<td>${p}</td>`).join('')}
            `;
        tbody.appendChild(tr);
    });

    const ref = pickFirstReferenceGroup(engineSummary, summary);
    const firstGroupName = ref?.name ?? '';
    const firstK = ref?.K ?? 0;
    const firstEl = document.getElementById(ANALYSIS_HERO_FIRST_ID);
    const secondEl = document.getElementById(ANALYSIS_HERO_SECOND_ID);
    const engineEl = document.getElementById(ANALYSIS_HERO_ENGINE_ID);
    const enginePct =
        totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, handSize)[0] : '—';
    if (firstEl)
        firstEl.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 5)[0] : '—';
    if (secondEl)
        secondEl.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 6)[0] : '—';
    if (engineEl) engineEl.textContent = enginePct;
    const heroGroupEl = document.getElementById(ANALYSIS_HERO_GROUP_ID);
    if (heroGroupEl) {
        heroGroupEl.textContent =
            firstGroupName && totalCards > 0
                ? `Réf. : ${firstGroupName} (${firstK} / ${totalCards} cartes) — P(≥1) en 5 ou 6 tirages.`
                : '';
    }

    const builderFirst = document.getElementById(BUILDER_STATS_FIRST_ID);
    const builderSecond = document.getElementById(BUILDER_STATS_SECOND_ID);
    const builderEngine = document.getElementById(BUILDER_STATS_ENGINE_ID);
    if (builderFirst)
        builderFirst.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 5)[0] : '—';
    if (builderSecond)
        builderSecond.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 6)[0] : '—';
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
                seg.style.flexBasis = `${pct}%`;
                seg.setAttribute(TITLE_ATTR, `${name}: ${K} (${pct.toFixed(1)}%)`);
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
                seg.style.flexBasis = `${pct}%`;
                seg.setAttribute(TITLE_ATTR, `${name}: ${K} (${pct.toFixed(1)}%)`);
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
                row.style.cursor = 'pointer';
                row.title = `Trier le Main Deck : ${name} en premier`;
                row.innerHTML = `<span class="${BUILDER_CATEGORY_LIST_LABEL_CLASS}">${escapeHtml(name)}</span><span class="${BUILDER_CATEGORY_LIST_COUNT_CLASS}">${K}</span><div class="${BUILDER_CATEGORY_LIST_BAR_WRAP_CLASS}"><div class="${BUILDER_CATEGORY_LIST_BAR_CLASS}" style="width:${pct}%"></div></div>`;
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
