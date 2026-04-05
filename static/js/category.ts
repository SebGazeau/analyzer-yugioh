import {
    CATEGORY_CHIP_CLASS,
    CATEGORY_CONTAINER_CLASS,
    CHIPS_CATEGORIES_CLASS,
    DROPDOWN_ARROW_CLASS,
    DROPDOWN_EMPTY_MESSAGE_CLASS,
    DROPDOWN_LIST_CLASS,
    DROPDOWN_LIST_VISIBLE_CLASS,
} from './categoryDomSelectors.js';

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

export const CATEGORY_GROUPS: Record<string, string[]> = {
    "Core Access": ["Starter", "Extender", "Consistency"],
    "Disruption": ["Interruption", "Hand Trap"],
    "Board Reset": ["Board Breaker", "Floodgate"],
    "Win Setup": ["Wincon", "Time", "Brick"]
};
export const categoryOptions: string[]  = [
    'Starter', 'Extender', 'Board Breaker', 'Floodgate',
    'Hand Trap', 'Wincon', 'Time', 'Brick', 'Consistency', 'Interruption',
    'Going First', 'Going Second'
];

interface CategoryContainer extends HTMLElement {
    addCategory?: (cat: string) => void;
    setCategories?: (categories: string[]) => void;
    getCategories?: () => string[];
    removeCategory?: (cat: string) => void;
}

export function createCategorySelector(): CategoryContainer {
    let catSelected: string[] = [];
    const container = document.createElement('div') as CategoryContainer;
    container.classList.add(CATEGORY_CONTAINER_CLASS);
    const display = document.createElement('div');
    display.className = CHIPS_CATEGORIES_CLASS;
    container.appendChild(display);
    const arrow = document.createElement('span');
    arrow.className = DROPDOWN_ARROW_CLASS;
    arrow.innerHTML = '&#9662;';
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
    container.addEventListener('click', (e) => {
        if (select.classList.contains(DROPDOWN_LIST_VISIBLE_CLASS)) {
            showDropdown(false);
        } else {
            showDropdown(true);
        }
    });
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target as Node) && !select.contains(e.target as Node)) {
            showDropdown(false);
        }
    });
    container.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === "Escape") showDropdown(false);
        if ((e as KeyboardEvent).key === "Tab") showDropdown(false);
    });
    function renderChips() {
        display.innerHTML = '';
        catSelected.forEach(value => {
            const chip = document.createElement('span');
            chip.className = CATEGORY_CHIP_CLASS;
            chip.textContent = value;
            const btn = document.createElement('button');
            btn.textContent = '×';
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
            none.textContent = 'Aucune option';
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
