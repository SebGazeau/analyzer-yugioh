/**
 * Attributs `data-*`, classes et `id` du modal « cartes associées ».
 */

export const ASSOCIATIONS_MODAL_ROOT_CLASS = 'associations-modal';
export const ASSOCIATIONS_MODAL_OPEN_CLASS = 'associations-modal--open';

/** IDs du shell (création dynamique dans `modal.ts`, alignés sur le markup injecté). */
export const ASSOCIATIONS_MODAL_ROOT_ID = 'associations-modal';
export const ASSOCIATIONS_MODAL_TITLE_ID = 'associations-modal-title';
export const ASSOCIATIONS_MODAL_SUBTITLE_ID = 'associations-modal-subtitle';
export const ASSOCIATIONS_MODAL_BODY_ID = 'associations-modal-body';
export const ASSOCIATIONS_MODAL_LOADING_ID = 'associations-modal-loading';
export const ASSOCIATIONS_MODAL_PANEL_ID = 'associations-modal-panel';
export const ASSOCIATIONS_MODAL_LIVE_ID = 'associations-modal-live';
export const ASSOCIATIONS_MODAL_ANCHOR_ART_ID = 'associations-modal-anchor-art';

export const DATA_ASSOCIATIONS_ADD_DECK_ATTR = 'data-associations-add-deck';
export const DATA_ASSOCIATIONS_CLOSE_ATTR = 'data-associations-close';
export const DATA_ASSOCIATIONS_ACTION_ATTR = 'data-associations-action';
export const ASSOCIATIONS_ACTION_COPY_MARKDOWN = 'copy-markdown';
export const ASSOCIATIONS_ACTION_EXPAND_TILES = 'expand-tiles';

export const ASSOCIATIONS_ADD_DECK_SELECTOR = `[${DATA_ASSOCIATIONS_ADD_DECK_ATTR}]`;
export const ASSOCIATIONS_CLOSE_SELECTOR = `[${DATA_ASSOCIATIONS_CLOSE_ATTR}]`;
export const ASSOCIATIONS_ACTION_COPY_MARKDOWN_SELECTOR = `[${DATA_ASSOCIATIONS_ACTION_ATTR}="${ASSOCIATIONS_ACTION_COPY_MARKDOWN}"]`;
export const ASSOCIATIONS_ACTION_EXPAND_TILES_SELECTOR = `[${DATA_ASSOCIATIONS_ACTION_ATTR}="${ASSOCIATIONS_ACTION_EXPAND_TILES}"]`;

export const DATA_ASSOCIATIONS_REST_IDS_ATTR = 'data-rest-ids';
/** Séparateur des ids dans la valeur CSV de `data-rest-ids` (join côté HTML, split côté modal). */
export const ASSOCIATIONS_REST_IDS_VALUE_SEPARATOR = ',';
export const DATA_CARD_ID_ATTR = 'data-card-id';

export const DATA_ASSOCIATIONS_ARCHETYPE_SOURCE_ATTR = 'data-associations-archetype-source';
export const DATA_ASSOCIATIONS_TILE_MORE_ATTR = 'data-associations-tile-more';

export const ASSOCIATIONS_MODAL_TILE_GRID_CLASS = 'associations-modal__tile-grid';
/** `<ul>` des vignettes d’un groupe (expansion tuiles). */
export const ASSOCIATIONS_MODAL_TILE_GRID_UL_SELECTOR = `ul.${ASSOCIATIONS_MODAL_TILE_GRID_CLASS}`;

export const ASSOCIATIONS_MODAL_TILE_MORE_LI_CLASS = 'associations-modal__tile-more';
export const ASSOCIATIONS_MODAL_TILE_MORE_LI_SELECTOR = `li.${ASSOCIATIONS_MODAL_TILE_MORE_LI_CLASS}`;

export const ASSOCIATIONS_MODAL_CLOSE_BTN_CLASS = 'associations-modal__close';
export const ASSOCIATIONS_MODAL_CLOSE_BTN_SELECTOR = `.${ASSOCIATIONS_MODAL_CLOSE_BTN_CLASS}`;

/** Coquille modal (créée dans le DOM si absente) + rapport HTML. */
export const ASSOCIATIONS_MODAL_BACKDROP_CLASS = 'associations-modal__backdrop';
export const ASSOCIATIONS_MODAL_PANEL_CLASS = 'associations-modal__panel';
export const ASSOCIATIONS_MODAL_LIVE_CLASS = 'associations-modal__live';
export const ASSOCIATIONS_MODAL_HEADER_CLASS = 'associations-modal__header';
export const ASSOCIATIONS_MODAL_HEADER_MAIN_CLASS = 'associations-modal__header-main';
export const ASSOCIATIONS_MODAL_ANCHOR_ART_CLASS = 'associations-modal__anchor-art';
export const ASSOCIATIONS_MODAL_HEADER_TEXT_CLASS = 'associations-modal__header-text';
export const ASSOCIATIONS_MODAL_TITLE_CLASS = 'associations-modal__title';
export const ASSOCIATIONS_MODAL_SUBTITLE_CLASS = 'associations-modal__subtitle';
export const ASSOCIATIONS_MODAL_LOADING_CLASS = 'associations-modal__loading';
export const ASSOCIATIONS_MODAL_SPINNER_CLASS = 'associations-modal__spinner';
export const ASSOCIATIONS_MODAL_BODY_CLASS = 'associations-modal__body';

export const ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS = 'associations-modal__thumb-placeholder';
export const ASSOCIATIONS_MODAL_TILE_IMG_CLASS = 'associations-modal__tile-img';
export const ASSOCIATIONS_MODAL_ANCHOR_IMG_CLASS = 'associations-modal__anchor-img';
export const ASSOCIATIONS_MODAL_TILE_CLASS = 'associations-modal__tile';
export const ASSOCIATIONS_MODAL_TILE_ART_CLASS = 'associations-modal__tile-art';
export const ASSOCIATIONS_MODAL_TILE_CAPTION_CLASS = 'associations-modal__tile-caption';
export const ASSOCIATIONS_MODAL_TILE_NAME_CLASS = 'associations-modal__tile-name';
export const ASSOCIATIONS_MODAL_EXPAND_TILES_BTN_CLASS = 'associations-modal__expand-tiles';

export const ASSOCIATIONS_MODAL_SUMMARY_CLASS = 'associations-modal__summary';
export const ASSOCIATIONS_MODAL_STAT_CLASS = 'associations-modal__stat';
export const ASSOCIATIONS_MODAL_STAT_VALUE_CLASS = 'associations-modal__stat-value';
export const ASSOCIATIONS_MODAL_ADD_HINT_CLASS = 'associations-modal__add-hint';
export const ASSOCIATIONS_MODAL_ANCHOR_META_CLASS = 'associations-modal__anchor-meta';
export const ASSOCIATIONS_MODAL_ANCHOR_LABEL_CLASS = 'associations-modal__anchor-label';
export const ASSOCIATIONS_MODAL_ARCH_SOURCE_CLASS = 'associations-modal__arch-source';
export const ASSOCIATIONS_MODAL_ARCH_SOURCE_CODE_CLASS = 'associations-modal__arch-source-code';
export const ASSOCIATIONS_MODAL_ANCHOR_NOTE_CLASS = 'associations-modal__anchor-note';

export const ASSOCIATIONS_MODAL_EMPTY_CLASS = 'associations-modal__empty';
export const ASSOCIATIONS_MODAL_EMPTY_TITLE_CLASS = 'associations-modal__empty-title';
export const ASSOCIATIONS_MODAL_EMPTY_TEXT_CLASS = 'associations-modal__empty-text';

export const ASSOCIATIONS_MODAL_ACC_LIST_CLASS = 'associations-modal__acc-list';
export const ASSOCIATIONS_MODAL_ACC_CLASS = 'associations-modal__acc';
export const ASSOCIATIONS_MODAL_ACC_SUMMARY_CLASS = 'associations-modal__acc-summary';
export const ASSOCIATIONS_MODAL_ACC_SUMMARY_MAIN_CLASS = 'associations-modal__acc-summary-main';
export const ASSOCIATIONS_MODAL_ACC_TITLE_CLASS = 'associations-modal__acc-title';
export const ASSOCIATIONS_MODAL_ACC_META_CLASS = 'associations-modal__acc-meta';
export const ASSOCIATIONS_MODAL_ACC_BADGE_CLASS = 'associations-modal__acc-badge';
export const ASSOCIATIONS_MODAL_ACC_PANEL_CLASS = 'associations-modal__acc-panel';

export const ASSOCIATIONS_MODAL_DIAGNOSTICS_CLASS = 'associations-modal__diagnostics';
export const ASSOCIATIONS_MODAL_FOOTER_CLASS = 'associations-modal__footer';
export const ASSOCIATIONS_MODAL_BTN_CLASS = 'associations-modal__btn';
export const ASSOCIATIONS_MODAL_RAW_CLASS = 'associations-modal__raw';
export const ASSOCIATIONS_MODAL_PRE_CLASS = 'associations-modal__pre';
export const ASSOCIATIONS_MODAL_ERROR_CLASS = 'associations-modal__error';

export const DATA_ASSOCIATION_ANGLE_ATTR = 'data-association-angle';

/** Gravité d’une entrée diagnostics (styles CSS `[data-severity='error'|…]`). */
export const DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR = 'data-severity';

export {
    ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT,
    ASSOCIATIONS_MODAL_CLOSE_BTN_ARIA_LABEL,
    ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT,
    ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT,
    ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE,
} from './associationsModalChromeCopy.js';

export {
    ASSOCIATIONS_MODAL_SUBTITLE_PASSCODE_LABEL,
    associationsModalSubtitle,
} from './associationsModalSubtitleCopy.js';
