/**
 * Rendu DOM des histogrammes de simulation de tirage (page Analysis).
 */

import { DATA_CATEGORY_ATTR } from './analysisCategorySummaryDomSelectors.js';
import {
    DRAW_HISTOGRAM_ALL_CATEGORIES_ID,
    DRAW_HISTOGRAM_ALL_TITLE_ID,
    DRAW_HISTOGRAM_CATEGORY_SELECT_ID,
    DRAW_HISTOGRAM_EXPLANATION_ID,
    DRAW_HISTOGRAM_HEADING_ID,
    DRAW_SIMULATION_HISTOGRAM_CONTAINER_ID,
} from './drawHistogramDomIds.js';
import {
    DRAW_HISTOGRAM_BAR_CLASS,
    DRAW_HISTOGRAM_BAR_WRAP_CLASS,
    DRAW_HISTOGRAM_CHART_CLASS,
    DRAW_HISTOGRAM_COUNT_CLASS,
    DRAW_HISTOGRAM_EMPTY_CLASS,
    DRAW_HISTOGRAM_LABEL_CLASS,
    DRAW_HISTOGRAM_MINI_BAR_CLASS,
    DRAW_HISTOGRAM_MINI_BAR_WRAP_CLASS,
    DRAW_HISTOGRAM_MINI_CHART_CLASS,
    DRAW_HISTOGRAM_MINI_CLASS,
    DRAW_HISTOGRAM_MINI_COUNT_CLASS,
    DRAW_HISTOGRAM_MINI_LABEL_CLASS,
    DRAW_HISTOGRAM_MINI_TITLE_CLASS,
    DRAW_HISTOGRAM_CATEGORY_FILL_VARS,
} from './drawHistogramDomSelectors.js';
import { ARIA_LABEL_ATTR } from '../utils/ariaAttrs.js';
import {
    STYLE_DISPLAY_BLOCK,
    STYLE_DISPLAY_NONE,
} from '../utils/cssInlineDisplay.js';
import { cssLengthPx } from '../utils/cssInlineLength.js';
import { getAllCategories, simulateDrawCounts, type ProbabilityCardEntry } from './probabilityMath.js';

const HISTOGRAM_SIM_ITERATIONS = 1000;

const HISTOGRAM_BAR_MAX_HEIGHT_PX = 120;
const HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX = 56;
/** Met à jour le &lt;select&gt; des catégories pour l’histogramme (rempli selon le deck). */
export function updateHistogramCategorySelect(categoryNames: string[]): void {
    const select = document.getElementById(DRAW_HISTOGRAM_CATEGORY_SELECT_ID) as HTMLSelectElement | null;
    if (!select) return;
    const selected = select.value;
    select.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = categoryNames.length === 0 ? '— Aucune catégorie —' : '— Choisir une catégorie —';
    select.appendChild(opt0);
    categoryNames.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === selected) opt.selected = true;
        select.appendChild(opt);
    });
}

/** Remplit le conteneur #draw-simulation-histogram avec les barres (0, 1, 2, ...). */
export function updateHistogramDOM(histogram: Record<number, number>, iterations: number, categoryLabel: string): void {
    const container = document.getElementById(DRAW_SIMULATION_HISTOGRAM_CONTAINER_ID);
    if (!container) return;

    const buckets = Object.keys(histogram)
        .map(Number)
        .sort((a, b) => a - b);

    container.innerHTML = '';
    container.setAttribute(ARIA_LABEL_ATTR, `Distribution sur ${iterations} tirages : ${categoryLabel}`);

    if (buckets.length === 0) {
        const msg = document.createElement('p');
        msg.className = DRAW_HISTOGRAM_EMPTY_CLASS;
        msg.textContent =
            categoryLabel === '—'
                ? 'Deck vide ou aucune catégorie. Assignez des catégories aux cartes (via « Modifier la carte ») pour afficher la distribution.'
                : `Aucune donnée pour "${categoryLabel}".`;
        container.appendChild(msg);
        return;
    }

    const maxCount = Math.max(1, ...Object.values(histogram));
    const wrap = document.createElement('div');
    wrap.className = DRAW_HISTOGRAM_CHART_CLASS;

    buckets.forEach((k) => {
        const n = histogram[k];
        const pct = iterations > 0 ? (n / iterations) * 100 : 0;
        const heightPx = maxCount > 0 ? (n / maxCount) * HISTOGRAM_BAR_MAX_HEIGHT_PX : 0;

        const barWrap = document.createElement('div');
        barWrap.className = DRAW_HISTOGRAM_BAR_WRAP_CLASS;
        const barTitle = `${k} carte(s) de la catégorie en main : ${n} simulations (${pct.toFixed(1)} %)`;
        barWrap.innerHTML = `
            <div class="${DRAW_HISTOGRAM_BAR_CLASS}" style="height: ${cssLengthPx(heightPx)}" title="${barTitle}"></div>
            <span class="${DRAW_HISTOGRAM_LABEL_CLASS}">${k}</span>
            <span class="${DRAW_HISTOGRAM_COUNT_CLASS}">${n}</span>
        `;
        wrap.appendChild(barWrap);
    });

    container.appendChild(wrap);
}

/** Rend un mini histogramme (une catégorie) avec une couleur du palette. */
export function appendCategoryMiniHistogram(
    container: HTMLElement,
    categoryName: string,
    histogram: Record<number, number>,
    iterations: number,
    colorIndex: number,
): void {
    const buckets = Object.keys(histogram)
        .map(Number)
        .sort((a, b) => a - b);
    if (buckets.length === 0) return;
    const maxCount = Math.max(1, ...Object.values(histogram));
    const color = DRAW_HISTOGRAM_CATEGORY_FILL_VARS[colorIndex % DRAW_HISTOGRAM_CATEGORY_FILL_VARS.length];
    const wrap = document.createElement('div');
    wrap.className = DRAW_HISTOGRAM_MINI_CLASS;
    wrap.setAttribute(DATA_CATEGORY_ATTR, categoryName);
    const title = document.createElement('div');
    title.className = DRAW_HISTOGRAM_MINI_TITLE_CLASS;
    title.textContent = categoryName;
    title.style.color = color;
    wrap.appendChild(title);
    const chart = document.createElement('div');
    chart.className = DRAW_HISTOGRAM_MINI_CHART_CLASS;
    buckets.forEach((k) => {
        const n = histogram[k];
        const heightPx = maxCount > 0 ? (n / maxCount) * HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX : 0;
        const barWrap = document.createElement('div');
        barWrap.className = DRAW_HISTOGRAM_MINI_BAR_WRAP_CLASS;
        barWrap.innerHTML = `
            <div class="${DRAW_HISTOGRAM_MINI_BAR_CLASS}" style="height:${cssLengthPx(heightPx)};background:${color}" title="${k} en main : ${n} / ${iterations}"></div>
            <span class="${DRAW_HISTOGRAM_MINI_LABEL_CLASS}">${k}</span>
            <span class="${DRAW_HISTOGRAM_MINI_COUNT_CLASS}">${n}</span>
        `;
        chart.appendChild(barWrap);
    });
    wrap.appendChild(chart);
    container.appendChild(wrap);
}

/** Efface le graphique principal et tous les mini-graphiques par catégorie (à la demande). */
export function clearHistogramGraphs(): void {
    const headingEl = document.getElementById(DRAW_HISTOGRAM_HEADING_ID);
    const explanationEl = document.getElementById(DRAW_HISTOGRAM_EXPLANATION_ID);
    const allTitleEl = document.getElementById(DRAW_HISTOGRAM_ALL_TITLE_ID);
    const allContainer = document.getElementById(DRAW_HISTOGRAM_ALL_CATEGORIES_ID);
    if (headingEl) headingEl.textContent = 'Distribution (1000 tirages)';
    if (explanationEl) explanationEl.style.display = STYLE_DISPLAY_NONE;
    if (allTitleEl) allTitleEl.style.display = STYLE_DISPLAY_NONE;
    if (allContainer) allContainer.innerHTML = '';
    updateHistogramDOM({}, 0, '—');
}

/** Lance 1000 simulations et met à jour l’histogramme principal + mini-graphs par catégorie. */
export function runHistogramSimulation1000(input: {
    cards: ProbabilityCardEntry[];
    handSize: 5 | 6;
}): void {
    const { cards, handSize } = input;
    const categories = getAllCategories(cards).sort();
    if (categories.length === 0 || cards.length === 0) {
        clearHistogramGraphs();
        return;
    }
    const select = document.getElementById(DRAW_HISTOGRAM_CATEGORY_SELECT_ID) as HTMLSelectElement | null;
    if (select && select.options.length <= 1) {
        updateHistogramCategorySelect(categories);
    }
    const selectedCategory =
        select?.value && categories.includes(select.value) ? select.value : categories[0];
    if (select && selectedCategory) {
        select.value = selectedCategory;
    }
    const iterations = HISTOGRAM_SIM_ITERATIONS;
    const headingEl = document.getElementById(DRAW_HISTOGRAM_HEADING_ID);
    const explanationEl = document.getElementById(DRAW_HISTOGRAM_EXPLANATION_ID);
    const hist = simulateDrawCounts(cards, selectedCategory, handSize, iterations);
    if (headingEl) headingEl.textContent = `Distribution (${iterations} tirages) — Catégorie : ${selectedCategory}`;
    if (explanationEl) {
        explanationEl.style.display = STYLE_DISPLAY_BLOCK;
        explanationEl.textContent = `En abscisse : nombre de cartes « ${selectedCategory} » en main (0, 1, 2, …). Hauteur des barres : nombre de simulations sur ${iterations} ayant ce résultat.`;
    }
    updateHistogramDOM(hist, iterations, selectedCategory);

    const allTitleEl = document.getElementById(DRAW_HISTOGRAM_ALL_TITLE_ID);
    const allContainer = document.getElementById(DRAW_HISTOGRAM_ALL_CATEGORIES_ID);
    if (allTitleEl) {
        allTitleEl.style.display = STYLE_DISPLAY_BLOCK;
        allTitleEl.textContent = `Toutes les catégories (${iterations} tirages chacune)`;
    }
    if (allContainer) {
        allContainer.innerHTML = '';
        categories.forEach((cat, i) => {
            const h = simulateDrawCounts(cards, cat, handSize, iterations);
            appendCategoryMiniHistogram(allContainer, cat, h, iterations, i);
        });
    }
}
