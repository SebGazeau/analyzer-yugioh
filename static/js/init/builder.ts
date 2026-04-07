/**
 * Init interface Builder (data-page="builder") : recherche, deck courant, grilles, toolbar, collapsibles zones.
 * Pour matrice de droits : désactiver ou masquer [data-page="builder"] + ne pas appeler initBuilder().
 */
import { BTN_ANALYZE_LINK_ID, LIVE_STATS_CONTAINER_ID } from '../analysis/builderShellDomIds.js';
import { ARIA_CONTROLS_ATTR, ARIA_EXPANDED_ATTR } from '../utils/ariaAttrs.js';
import { DOM_EVENT_CHANGE, DOM_EVENT_CLICK } from '../utils/domEventNames.js';
import { HIDDEN_ATTR } from '../utils/htmlAttrs.js';
import {
    BUILDER_COMPOSITION_ACCORDION_ITEM_SELECTOR,
    BUILDER_COMPOSITION_ITEM_EXPANDED_CLASS,
    BUILDER_ENGINE_SELECT_CLASS,
    BUILDER_QTY_SELECT_CLASS,
    BUILDER_SORT_CLICK_ZONE_SELECTOR,
    BUILDER_STATS_CATEGORIES_TITLE_SELECTOR,
    BUILDER_STATS_COMPOSITION_TITLE_SELECTOR,
    COMPOSITION_TOGGLE_SELECTOR,
    DATA_BUILDER_SORT_ATTR,
    DATA_BUILDER_SORT_CATEGORY_ATTR,
    DATA_COMPOSITION_TOGGLE_ATTR,
} from '../deck-builder/builderDomSelectors.js';
import { prefetchAssociationCatalogWhenIdle } from '../associations/associationFetchCache.js';
import {
    DECK_BUILDER_GRID_COLUMN_COUNT,
    DECK_GRID_DOM_IDS,
    DECK_TABLE_GRID_SELECTOR,
    REMOVE_ROW_BTN_CLASS,
} from '../deck-builder/deckConstants.js';
import { DECK_SORT_CHANGED_EVENT } from '../deck-builder/deckSortEvents.js';
import { syncBuilderStatsFromDeck } from '../stats.js';
import { setupSearch } from '../search.js';
import { enableGridRowDeletion, enableColumnSort, setMainDeckSortByType, setMainDeckSortByCategory, getMainDeckSortState, refreshDeckSaveUpdateButtons, bindDeckDragAndDrop } from '../deck.js';
import { bindDeckToolbar } from './deck-actions.js';
import { bindKeyboard } from './keyboard.js';
import { bindCollapsibles } from './collapsibles.js';
import {
    BUILDER_SORT_INDICATOR_ASC,
    BUILDER_SORT_INDICATOR_DESC,
    BUILDER_SORT_TITLE_CATEGORIES_MAIN,
    BUILDER_SORT_TITLE_COMPOSITION,
} from './builderSortTitlesCopy.js';

function updateBuilderSortIndicators(): void {
    const { by, category, dir } = getMainDeckSortState();
    const compBlock = document.querySelector(BUILDER_STATS_COMPOSITION_TITLE_SELECTOR);
    const catBlock = document.querySelector(BUILDER_STATS_CATEGORIES_TITLE_SELECTOR);
    if (compBlock) {
        const arrow = by === 'type' ? (dir === 'asc' ? BUILDER_SORT_INDICATOR_ASC : BUILDER_SORT_INDICATOR_DESC) : '';
        compBlock.textContent = BUILDER_SORT_TITLE_COMPOSITION + arrow;
    }
    if (catBlock) {
        const arrow =
            by === 'category' ? (dir === 'asc' ? BUILDER_SORT_INDICATOR_ASC : BUILDER_SORT_INDICATOR_DESC) : '';
        const suffix = category ? ` : ${category}` : '';
        catBlock.textContent = BUILDER_SORT_TITLE_CATEGORIES_MAIN + suffix + arrow;
    }
}

export function initBuilder(): void {
    syncBuilderStatsFromDeck();
    refreshDeckSaveUpdateButtons();
    if (typeof setupSearch === 'function') {
        setupSearch();
    }
    prefetchAssociationCatalogWhenIdle();

    document.addEventListener(DOM_EVENT_CHANGE, (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (
            target?.classList.contains(BUILDER_QTY_SELECT_CLASS) ||
            target?.classList.contains(BUILDER_ENGINE_SELECT_CLASS)
        ) {
            syncBuilderStatsFromDeck();
        }
    });

    enableGridRowDeletion(DECK_TABLE_GRID_SELECTOR, DECK_BUILDER_GRID_COLUMN_COUNT, REMOVE_ROW_BTN_CLASS, syncBuilderStatsFromDeck);
    DECK_GRID_DOM_IDS.forEach((id) => {
        enableColumnSort(id, DECK_BUILDER_GRID_COLUMN_COUNT, () => syncBuilderStatsFromDeck());
    });

    bindDeckToolbar();

    const liveStats = document.getElementById(LIVE_STATS_CONTAINER_ID);
    if (liveStats) {
        liveStats.addEventListener(DOM_EVENT_CLICK, (e: Event) => {
            const toggle = (e.target as HTMLElement).closest?.(COMPOSITION_TOGGLE_SELECTOR) as HTMLElement | null;
            if (toggle) {
                e.preventDefault();
                const kind = toggle.getAttribute(DATA_COMPOSITION_TOGGLE_ATTR);
                const controlsId = toggle.getAttribute(ARIA_CONTROLS_ATTR);
                const item = toggle.closest(BUILDER_COMPOSITION_ACCORDION_ITEM_SELECTOR);
                const detail = controlsId ? document.getElementById(controlsId) : null;
                if (!item || !detail) return;
                const expanded = item.classList.toggle(BUILDER_COMPOSITION_ITEM_EXPANDED_CLASS);
                toggle.setAttribute(ARIA_EXPANDED_ATTR, String(expanded));
                if (expanded) detail.removeAttribute(HIDDEN_ATTR); else detail.setAttribute(HIDDEN_ATTR, '');
                return;
            }
            const target = (e.target as HTMLElement).closest?.(BUILDER_SORT_CLICK_ZONE_SELECTOR) as HTMLElement | null;
            if (!target) return;
            e.preventDefault();
            const sort = target.getAttribute(DATA_BUILDER_SORT_ATTR);
            const cat = target.getAttribute(DATA_BUILDER_SORT_CATEGORY_ATTR);
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

    document.getElementById(BTN_ANALYZE_LINK_ID)?.addEventListener(DOM_EVENT_CLICK, (e) => {
        e.preventDefault();
        import('../tabs.js').then((t) => t.setActiveTab(t.TAB_ID_ANALYSIS));
    });

    bindKeyboard();
    bindCollapsibles();
    bindDeckDragAndDrop();
}
