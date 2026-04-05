/**
 * Init interface Builder (data-page="builder") : recherche, deck courant, grilles, toolbar, collapsibles zones.
 * Pour matrice de droits : désactiver ou masquer [data-page="builder"] + ne pas appeler initBuilder().
 */
import { BTN_ANALYZE_LINK_ID, LIVE_STATS_CONTAINER_ID } from '../analysis/builderShellDomIds.js';
import { prefetchAssociationCatalogWhenIdle } from '../associations/associationFetchCache.js';
import { DECK_GRID_DOM_IDS } from '../deck-builder/deckConstants.js';
import { DECK_SORT_CHANGED_EVENT } from '../deck-builder/deckSortEvents.js';
import { syncBuilderStatsFromDeck } from '../stats.js';
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
    syncBuilderStatsFromDeck();
    refreshDeckSaveUpdateButtons();
    if (typeof setupSearch === 'function') {
        setupSearch();
    }
    prefetchAssociationCatalogWhenIdle();

    document.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (target?.classList.contains('qty-select') || target?.classList.contains('engine-select')) {
            syncBuilderStatsFromDeck();
        }
    });

    enableGridRowDeletion('.deck-table-grid', 7, 'remove-row-btn', syncBuilderStatsFromDeck);
    DECK_GRID_DOM_IDS.forEach((id) => {
        enableColumnSort(id, 7, () => syncBuilderStatsFromDeck());
    });

    bindDeckToolbar();

    const liveStats = document.getElementById(LIVE_STATS_CONTAINER_ID);
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
        window.addEventListener(DECK_SORT_CHANGED_EVENT, updateBuilderSortIndicators);
    }
    updateBuilderSortIndicators();

    document.getElementById(BTN_ANALYZE_LINK_ID)?.addEventListener('click', (e) => {
        e.preventDefault();
        import('../tabs.js').then((t) => t.setActiveTab(t.TAB_ID_ANALYSIS));
    });

    bindKeyboard();
    bindCollapsibles();
    bindDeckDragAndDrop();
}
