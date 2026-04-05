/**
 * `data-*` et sélecteurs pour stats / tri / accordéon composition (Builder).
 */

export const DATA_BUILDER_STATS_ATTR = 'data-builder-stats';
export const BUILDER_STATS_BLOCK_COMPOSITION = 'composition';
export const BUILDER_STATS_BLOCK_CATEGORIES = 'categories';

function builderStatsBlockTitleSelector(blockValue: string): string {
    return `[${DATA_BUILDER_STATS_ATTR}="${blockValue}"] .builder-stats-block-title`;
}

export const BUILDER_STATS_COMPOSITION_TITLE_SELECTOR = builderStatsBlockTitleSelector(
    BUILDER_STATS_BLOCK_COMPOSITION,
);
export const BUILDER_STATS_CATEGORIES_TITLE_SELECTOR = builderStatsBlockTitleSelector(
    BUILDER_STATS_BLOCK_CATEGORIES,
);

export const DATA_COMPOSITION_TOGGLE_ATTR = 'data-composition-toggle';
export const COMPOSITION_TOGGLE_SELECTOR = `[${DATA_COMPOSITION_TOGGLE_ATTR}]`;

export const DATA_BUILDER_SORT_ATTR = 'data-builder-sort';
export const DATA_BUILDER_SORT_CATEGORY_ATTR = 'data-builder-sort-category';
export const BUILDER_SORT_CLICK_ZONE_SELECTOR = `[${DATA_BUILDER_SORT_ATTR}], [${DATA_BUILDER_SORT_CATEGORY_ATTR}]`;

export const BUILDER_COMPOSITION_ACCORDION_ITEM_CLASS = 'builder-composition-accordion-item';
export const BUILDER_COMPOSITION_ACCORDION_ITEM_SELECTOR = `.${BUILDER_COMPOSITION_ACCORDION_ITEM_CLASS}`;
export const BUILDER_COMPOSITION_ITEM_EXPANDED_CLASS = 'builder-composition-item--expanded';

/** Sélects grille deck (popover) — écoutés pour resync stats. */
export const BUILDER_QTY_SELECT_CLASS = 'qty-select';
export const BUILDER_ENGINE_SELECT_CLASS = 'engine-select';
