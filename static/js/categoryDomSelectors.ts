/**
 * Widget sélecteur de catégories (popover deck / chips).
 */

export const CATEGORY_CONTAINER_CLASS = 'category-container';
export const CHIPS_CATEGORIES_CLASS = 'chips-categories';
/** Texte gris quand aucune puce (popover deck). */
export const CHIPS_PLACEHOLDER_CLASS = 'chips-categories__placeholder';
export const DROPDOWN_ARROW_CLASS = 'dropdown-arrow';
export const DROPDOWN_LIST_CLASS = 'dropdown-list';
/** Liste rendue sous `document.body` (évite le clipping `overflow` du popover). */
export const DROPDOWN_LIST_FLOATING_CLASS = 'dropdown-list--floating';
/** Message « aucune option » (couleur via CSS, pas d’inline). */
export const DROPDOWN_EMPTY_MESSAGE_CLASS = 'dropdown-list__empty';
/** État ouvert de la liste déroulante. */
export const DROPDOWN_LIST_VISIBLE_CLASS = 'show';

export const CATEGORY_CHIP_CLASS = 'chip';

export {
    CATEGORY_CHIP_REMOVE_BUTTON_TEXT,
    DROPDOWN_ARROW_TEXT,
    DROPDOWN_EMPTY_MESSAGE_TEXT,
} from './categorySelectorCopy.js';
