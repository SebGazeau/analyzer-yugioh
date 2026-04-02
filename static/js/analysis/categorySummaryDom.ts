/**
 * DOM : tableau Analysis (engines, catégories, groupes), hero probas, bandeaux catégories.
 */

import { CATEGORY_GROUPS } from '../category.js';
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
    tr.className = 'analysis-section-header';
    if (sectionId) {
        tr.setAttribute('data-section-header', sectionId);
        tr.setAttribute('role', 'button');
        tr.setAttribute('tabindex', '0');
        tr.setAttribute('aria-expanded', 'true');
        tr.innerHTML = `<td colspan="9"><span class="analysis-section-header-toggle" aria-hidden="true">▼</span> <strong>${escapeHtml(title)}</strong></td>`;
    } else {
        tr.innerHTML = `<td colspan="9"><strong>${escapeHtml(title)}</strong></td>`;
    }
    tbody.appendChild(tr);
}

function analysisCategoryDotClass(index: number): string {
    return 'analysis-category-dot analysis-category-dot--' + ANALYSIS_DOT_COLORS[index % ANALYSIS_DOT_COLORS.length];
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
    const tbody = document.getElementById('category-summary-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const { simulationBanner, summary, engineSummary, totalCards, numDraws, handSize } = input;

    if (simulationBanner) {
        addSectionHeader(tbody, simulationBanner);
    }

    const pctDeck = (K: number) => (totalCards > 0 ? ((K / totalCards) * 100).toFixed(1) + '%' : '—');
    let dataRowIndex = 0;

    addSectionHeader(tbody, 'Engines', 'engines');
    Object.entries(engineSummary)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([engineName, cardMap]) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-section', 'engines');
            const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
            const probs = hypergeometricProbRowStrings(K, totalCards, numDraws);
            const dotClass = analysisCategoryDotClass(dataRowIndex++);
            tr.innerHTML = `
                    <td><span class="analysis-category-dot ${dotClass}" aria-hidden="true"></span><strong>${escapeHtml(engineName)}</strong></td>
                    <td class="analysis-td-count">${K}</td>
                    <td class="analysis-td-pct">${pctDeck(K)}</td>
                    <td class="analysis-td-prob5">${probs[0]}</td>
                    ${probs.slice(1).map((p) => `<td>${p}</td>`).join('')}
                `;
            tbody.appendChild(tr);
        });

    addSectionHeader(tbody, 'Catégories', 'categories');
    Object.keys(summary)
        .sort()
        .forEach((cat) => {
            const cardMap = summary[cat];
            const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
            const probs = hypergeometricProbRowStrings(K, totalCards, numDraws);
            const dotClass = analysisCategoryDotClass(dataRowIndex++);
            const tr = document.createElement('tr');
            tr.setAttribute('data-section', 'categories');
            tr.innerHTML = `
                    <td><span class="analysis-category-dot ${dotClass}" aria-hidden="true"></span>${escapeHtml(cat)}</td>
                    <td class="analysis-td-count">${K}</td>
                    <td class="analysis-td-pct">${pctDeck(K)}</td>
                    <td class="analysis-td-prob5">${probs[0]}</td>
                    ${probs.slice(1).map((p) => `<td>${p}</td>`).join('')}
                `;
            tbody.appendChild(tr);
        });

    addSectionHeader(tbody, 'Groupes de catégories', 'groupes');
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
        tr.setAttribute('data-section', 'groupes');
        tr.innerHTML = `
                <td><span class="analysis-category-dot ${dotClass}" aria-hidden="true"></span><strong>${escapeHtml(groupName)}</strong></td>
                <td class="analysis-td-count">${K}</td>
                <td class="analysis-td-pct">${pctDeck(K)}</td>
                <td class="analysis-td-prob5">${probs[0]}</td>
                ${probs.slice(1).map((p) => `<td>${p}</td>`).join('')}
            `;
        tbody.appendChild(tr);
    });

    const ref = pickFirstReferenceGroup(engineSummary, summary);
    const firstGroupName = ref?.name ?? '';
    const firstK = ref?.K ?? 0;
    const firstEl = document.getElementById('analysis-hero-first');
    const secondEl = document.getElementById('analysis-hero-second');
    const engineEl = document.getElementById('analysis-hero-engine');
    const enginePct =
        totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, handSize)[0] : '—';
    if (firstEl)
        firstEl.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 5)[0] : '—';
    if (secondEl)
        secondEl.textContent =
            totalCards > 0 && firstK > 0 ? hypergeometricProbRowStrings(firstK, totalCards, 6)[0] : '—';
    if (engineEl) engineEl.textContent = enginePct;
    const heroGroupEl = document.getElementById('analysis-hero-group');
    if (heroGroupEl) {
        heroGroupEl.textContent =
            firstGroupName && totalCards > 0
                ? `Réf. : ${firstGroupName} (${firstK} / ${totalCards} cartes) — P(≥1) en 5 ou 6 tirages.`
                : '';
    }

    const builderFirst = document.getElementById('builder-stats-first');
    const builderSecond = document.getElementById('builder-stats-second');
    const builderEngine = document.getElementById('builder-stats-engine');
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

    const stripEl = document.getElementById('deck-composition-strip');
    if (stripEl) {
        stripEl.innerHTML = '';
        if (sumAll > 0) {
            entries.forEach(({ name, K }) => {
                const pct = (K / sumAll) * 100;
                const seg = document.createElement('div');
                seg.className = 'deck-composition-segment';
                seg.style.flexBasis = `${pct}%`;
                seg.setAttribute('title', `${name}: ${K} (${pct.toFixed(1)}%)`);
                seg.setAttribute('data-category', name);
                stripEl.appendChild(seg);
            });
        }
    }

    const sidebarBarEl = document.getElementById('deck-stats-category-bar');
    if (sidebarBarEl) {
        sidebarBarEl.innerHTML = '';
        if (sumAll > 0) {
            entries.forEach(({ name, K }) => {
                const pct = (K / sumAll) * 100;
                const seg = document.createElement('div');
                seg.className = 'deck-stats-category-segment';
                seg.style.flexBasis = `${pct}%`;
                seg.setAttribute('title', `${name}: ${K} (${pct.toFixed(1)}%)`);
                seg.setAttribute('data-category', name);
                sidebarBarEl.appendChild(seg);
            });
        }
    }

    const categoryListEl = document.getElementById('builder-category-list');
    if (categoryListEl) {
        categoryListEl.innerHTML = '';
        if (sumAll > 0) {
            entries.forEach(({ name, K }) => {
                const pct = (K / sumAll) * 100;
                const row = document.createElement('div');
                row.className = 'builder-category-list-row';
                row.setAttribute('data-builder-sort-category', name);
                row.style.cursor = 'pointer';
                row.title = `Trier le Main Deck : ${name} en premier`;
                row.innerHTML = `<span class="builder-category-list-label">${escapeHtml(name)}</span><span class="builder-category-list-count">${K}</span><div class="builder-category-list-bar-wrap"><div class="builder-category-list-bar" style="width:${pct}%"></div></div>`;
                categoryListEl.appendChild(row);
            });
        }
    }
}
