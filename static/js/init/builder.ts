/**
 * Init interface Builder (data-page="builder") : recherche, deck courant, grilles, toolbar, collapsibles zones.
 * Pour matrice de droits : désactiver ou masquer [data-page="builder"] + ne pas appeler initBuilder().
 */
import { updateDeckCount, updateProbabilities, computeGlobalStats } from '../stats.js';
import { setupSearch } from '../search.js';
import { enableGridRowDeletion, enableColumnSort, setMainDeckSortByType, setMainDeckSortByCategory, getMainDeckSortState, refreshDeckSaveUpdateButtons, bindDeckDragAndDrop } from '../deck.js';
import { bindDeckToolbar } from './deck-actions.js';
import { bindKeyboard } from './keyboard.js';
import { bindCollapsibles } from './collapsibles.js';

const SORT_ARROW_ASC = ' ↑';
const SORT_ARROW_DESC = ' ↓';
const TITLE_COMPOSITION = 'Composition';
const TITLE_CATEGORIES = 'Catégories (Main)';

function updateBuilderSortIndicators(): void {
    const { by, category, dir } = getMainDeckSortState();
    const compBlock = document.querySelector('[data-builder-stats="composition"] .builder-stats-block-title');
    const catBlock = document.querySelector('[data-builder-stats="categories"] .builder-stats-block-title');
    if (compBlock) {
        const arrow = by === 'type' ? (dir === 'asc' ? SORT_ARROW_ASC : SORT_ARROW_DESC) : '';
        compBlock.textContent = TITLE_COMPOSITION + arrow;
    }
    if (catBlock) {
        const arrow = by === 'category' ? (dir === 'asc' ? SORT_ARROW_ASC : SORT_ARROW_DESC) : '';
        const suffix = category ? ` : ${category}` : '';
        catBlock.textContent = TITLE_CATEGORIES + suffix + arrow;
    }
}

export function initBuilder(): void {
    updateDeckCount();
    computeGlobalStats();
    refreshDeckSaveUpdateButtons();
    if (typeof setupSearch === 'function') {
        setupSearch();
    }

    document.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (target?.classList.contains('qty-select') || target?.classList.contains('engine-select')) {
            updateDeckCount();
            computeGlobalStats();
        }
    });

    enableGridRowDeletion('.deck-table-grid', 7, 'remove-row-btn', updateDeckCount);
    ['deck-main-grid', 'deck-extra-grid', 'deck-side-grid'].forEach((id) => {
        enableColumnSort(id, 7, () => {
            updateDeckCount();
            updateProbabilities();
            computeGlobalStats();
        });
    });

    bindDeckToolbar();

    const liveStats = document.getElementById('live-stats');
    if (liveStats) {
        liveStats.addEventListener('click', (e: Event) => {
            const toggle = (e.target as HTMLElement).closest?.('[data-composition-toggle]') as HTMLElement | null;
            if (toggle) {
                e.preventDefault();
                const kind = toggle.getAttribute('data-composition-toggle');
                const controlsId = toggle.getAttribute('aria-controls');
                const item = toggle.closest('.builder-composition-accordion-item');
                const detail = controlsId ? document.getElementById(controlsId) : null;
                if (!item || !detail) return;
                const expanded = item.classList.toggle('builder-composition-item--expanded');
                toggle.setAttribute('aria-expanded', String(expanded));
                if (expanded) detail.removeAttribute('hidden'); else detail.setAttribute('hidden', '');
                return;
            }
            const target = (e.target as HTMLElement).closest?.('[data-builder-sort], [data-builder-sort-category]') as HTMLElement | null;
            if (!target) return;
            e.preventDefault();
            const sort = target.getAttribute('data-builder-sort');
            const cat = target.getAttribute('data-builder-sort-category');
            if (sort === 'composition') {
                setMainDeckSortByType();
            } else if (sort === 'categories') {
                setMainDeckSortByCategory(null);
            } else if (cat !== null && cat !== undefined) {
                setMainDeckSortByCategory(cat);
            }
        });
        window.addEventListener('deck-sort-changed', updateBuilderSortIndicators);
    }
    updateBuilderSortIndicators();

    document.getElementById('btn-analyze-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        import('../main.js').then((m) => m.setActiveTab('analysis'));
    });

    bindKeyboard();
    bindCollapsibles();
    bindDeckDragAndDrop();
}
