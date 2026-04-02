/**
 * Rendu DOM des histogrammes de simulation de tirage (page Analysis).
 */

const HISTOGRAM_BAR_MAX_HEIGHT_PX = 120;
const HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX = 56;
const HISTOGRAM_CATEGORY_COLORS = [
    'var(--color-zone-main)',
    'var(--color-zone-extra)',
    'var(--color-zone-side)',
    'var(--color-gold)',
    'var(--color-info)',
    'var(--color-success)',
    'var(--color-amber)',
    'var(--color-danger)',
];

/** Met à jour le &lt;select&gt; des catégories pour l’histogramme (rempli selon le deck). */
export function updateHistogramCategorySelect(categoryNames: string[]): void {
    const select = document.getElementById('draw-histogram-category') as HTMLSelectElement | null;
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
    const container = document.getElementById('draw-simulation-histogram');
    if (!container) return;

    const buckets = Object.keys(histogram)
        .map(Number)
        .sort((a, b) => a - b);

    container.innerHTML = '';
    container.setAttribute('aria-label', `Distribution sur ${iterations} tirages : ${categoryLabel}`);

    if (buckets.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'draw-histogram-empty';
        msg.textContent =
            categoryLabel === '—'
                ? 'Deck vide ou aucune catégorie. Assignez des catégories aux cartes (via « Modifier la carte ») pour afficher la distribution.'
                : `Aucune donnée pour "${categoryLabel}".`;
        container.appendChild(msg);
        return;
    }

    const maxCount = Math.max(1, ...Object.values(histogram));
    const wrap = document.createElement('div');
    wrap.className = 'draw-histogram-chart';

    buckets.forEach((k) => {
        const n = histogram[k];
        const pct = iterations > 0 ? (n / iterations) * 100 : 0;
        const heightPx = maxCount > 0 ? (n / maxCount) * HISTOGRAM_BAR_MAX_HEIGHT_PX : 0;

        const barWrap = document.createElement('div');
        barWrap.className = 'draw-histogram-bar-wrap';
        const barTitle = `${k} carte(s) de la catégorie en main : ${n} simulations (${pct.toFixed(1)} %)`;
        barWrap.innerHTML = `
            <div class="draw-histogram-bar" style="height: ${heightPx}px" title="${barTitle}"></div>
            <span class="draw-histogram-label">${k}</span>
            <span class="draw-histogram-count">${n}</span>
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
    const color = HISTOGRAM_CATEGORY_COLORS[colorIndex % HISTOGRAM_CATEGORY_COLORS.length];
    const wrap = document.createElement('div');
    wrap.className = 'draw-histogram-mini';
    wrap.setAttribute('data-category', categoryName);
    const title = document.createElement('div');
    title.className = 'draw-histogram-mini-title';
    title.textContent = categoryName;
    title.style.color = color;
    wrap.appendChild(title);
    const chart = document.createElement('div');
    chart.className = 'draw-histogram-mini-chart';
    buckets.forEach((k) => {
        const n = histogram[k];
        const heightPx = maxCount > 0 ? (n / maxCount) * HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX : 0;
        const barWrap = document.createElement('div');
        barWrap.className = 'draw-histogram-mini-bar-wrap';
        barWrap.innerHTML = `
            <div class="draw-histogram-mini-bar" style="height:${heightPx}px;background:${color}" title="${k} en main : ${n} / ${iterations}"></div>
            <span class="draw-histogram-mini-label">${k}</span>
            <span class="draw-histogram-mini-count">${n}</span>
        `;
        chart.appendChild(barWrap);
    });
    wrap.appendChild(chart);
    container.appendChild(wrap);
}

/** Efface le graphique principal et tous les mini-graphiques par catégorie (à la demande). */
export function clearHistogramGraphs(): void {
    const headingEl = document.getElementById('draw-histogram-heading');
    const explanationEl = document.getElementById('draw-histogram-explanation');
    const allTitleEl = document.getElementById('draw-histogram-all-title');
    const allContainer = document.getElementById('draw-histogram-all-categories');
    if (headingEl) headingEl.textContent = 'Distribution (1000 tirages)';
    if (explanationEl) explanationEl.style.display = 'none';
    if (allTitleEl) allTitleEl.style.display = 'none';
    if (allContainer) allContainer.innerHTML = '';
    updateHistogramDOM({}, 0, '—');
}
