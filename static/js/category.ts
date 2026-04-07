import {
    CATEGORY_CHIP_CLASS,
    CATEGORY_CHIP_REMOVE_BUTTON_TEXT,
    CATEGORY_CONTAINER_CLASS,
    CHIPS_CATEGORIES_CLASS,
    DROPDOWN_ARROW_CLASS,
    DROPDOWN_ARROW_TEXT,
    DROPDOWN_EMPTY_MESSAGE_CLASS,
    DROPDOWN_EMPTY_MESSAGE_TEXT,
    DROPDOWN_LIST_CLASS,
    DROPDOWN_LIST_VISIBLE_CLASS,
} from './categoryDomSelectors.js';
import { categoryOptions } from './categoryData.js';
import { DOM_EVENT_CLICK, DOM_EVENT_KEYDOWN } from './utils/domEventNames.js';
import { KEY_ESCAPE, KEY_TAB } from './utils/keyboardKeys.js';

export { CATEGORY_GROUPS, categoryOptions } from './categoryData.js';

// Gestion des catégories de cartes

/** Entrée de deck avec catégories (pour logique pure). */
export interface DeckEntryWithCategories {
    name: string;
    quantity?: number;
    categories?: string[];
}

/** Retourne les entrées du deck qui ont la catégorie donnée. */
export function getCardsByCategory(
    deck: DeckEntryWithCategories[],
    categoryName: string,
): DeckEntryWithCategories[] {
    return deck.filter(
        (entry) => entry.categories && entry.categories.includes(categoryName),
    );
}

/** Nœud DOM renvoyé par `createCategorySelector` (méthodes rattachées sur l’élément racine). */
export interface CategorySelectorElement extends HTMLElement {
    addCategory?: (cat: string) => void;
    setCategories?: (categories: string[]) => void;
    getCategories?: () => string[];
    removeCategory?: (cat: string) => void;
}

export function isCategorySelectorElement(el: Element | null | undefined): el is CategorySelectorElement {
    return el != null && typeof (el as CategorySelectorElement).getCategories === 'function';
}

export function createCategorySelector(): CategorySelectorElement {
    let catSelected: string[] = [];
    const container = document.createElement('div') as CategorySelectorElement;
    container.classList.add(CATEGORY_CONTAINER_CLASS);
    const display = document.createElement('div');
    display.className = CHIPS_CATEGORIES_CLASS;
    container.appendChild(display);
    const arrow = document.createElement('span');
    arrow.className = DROPDOWN_ARROW_CLASS;
    arrow.textContent = DROPDOWN_ARROW_TEXT;
    display.appendChild(arrow);
    const select = document.createElement('div');
    select.className = DROPDOWN_LIST_CLASS;
    categoryOptions.forEach(cat => {
        if (!catSelected.includes(cat)) {
        const item = document.createElement('div');
        item.textContent = cat;
        item.onclick = (e) => {
            e.stopPropagation();
            addChip(cat);
            showDropdown(false);
        };
        select.appendChild(item);
        }
    });
    container.appendChild(select);
    container.addEventListener(DOM_EVENT_CLICK, (e) => {
        if (select.classList.contains(DROPDOWN_LIST_VISIBLE_CLASS)) {
            showDropdown(false);
        } else {
            showDropdown(true);
        }
    });
    document.addEventListener(DOM_EVENT_CLICK, (e) => {
        if (!container.contains(e.target as Node) && !select.contains(e.target as Node)) {
            showDropdown(false);
        }
    });
    container.addEventListener(DOM_EVENT_KEYDOWN, (e) => {
        const key = (e as KeyboardEvent).key;
        if (key === KEY_ESCAPE || key === KEY_TAB) showDropdown(false);
    });
    function renderChips() {
        display.innerHTML = '';
        catSelected.forEach(value => {
            const chip = document.createElement('span');
            chip.className = CATEGORY_CHIP_CLASS;
            chip.textContent = value;
            const btn = document.createElement('button');
            btn.textContent = CATEGORY_CHIP_REMOVE_BUTTON_TEXT;
            btn.onclick = (e) => {
                e.stopPropagation();
                removeChip(value);
            };
            chip.appendChild(btn);
            display.appendChild(chip);
        });
        display.appendChild(arrow);
    }
    function renderDropdown() {
        select.innerHTML = '';
        categoryOptions.forEach(opt => {
            if (!catSelected.includes(opt)) {
                const item = document.createElement('div');
                item.textContent = opt;
                item.onclick = (e) => {
                    e.stopPropagation();
                    addChip(opt);
                    showDropdown(false);
                };
                select.appendChild(item);
            }
        });
        if (select.innerHTML.trim() === '') {
            const none = document.createElement('div');
            none.classList.add(DROPDOWN_EMPTY_MESSAGE_CLASS);
            none.textContent = DROPDOWN_EMPTY_MESSAGE_TEXT;
            select.appendChild(none);
        }
    }
    function addChip(value: string) {
        if (!catSelected.includes(value)) {
            catSelected.push(value);
            renderChips();
        }
    }
    function removeChip(value: string) {
        catSelected = catSelected.filter(val => val !== value);
        renderChips();
    }
    function showDropdown(show: boolean) {
        if (show) {
            renderDropdown();
            select.classList.add(DROPDOWN_LIST_VISIBLE_CLASS);
        } else {
            select.classList.remove(DROPDOWN_LIST_VISIBLE_CLASS);
        }
    }
    container.addCategory = function(cat: string) {
        addChip(cat);
    };
    container.setCategories = function(categories: string[]) {
        categories.forEach(cat => addChip(cat));
    };
    container.getCategories = function() {
        return [...catSelected];
    };
    container.removeCategory = function(cat: string) {
        removeChip(cat);
    };
    return container;
}
