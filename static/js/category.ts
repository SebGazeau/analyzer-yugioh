import {
    CATEGORY_CHIP_CLASS,
    CATEGORY_CHIP_REMOVE_BUTTON_TEXT,
    CATEGORY_CONTAINER_CLASS,
    CHIPS_CATEGORIES_CLASS,
    CHIPS_PLACEHOLDER_CLASS,
    DROPDOWN_ARROW_CLASS,
    DROPDOWN_ARROW_TEXT,
    DROPDOWN_EMPTY_MESSAGE_CLASS,
    DROPDOWN_EMPTY_MESSAGE_TEXT,
    DROPDOWN_LIST_CLASS,
    DROPDOWN_LIST_FLOATING_CLASS,
    DROPDOWN_LIST_VISIBLE_CLASS,
} from './categoryDomSelectors.js';
import { DECK_CARD_POPOVER_ROOT_CLASS } from './deck-builder/card-edit-popover/deckCardPopoverDomSelectors.js';
import { categoryOptions } from './categoryData.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from './utils/ariaAttrs.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON } from './utils/htmlAttrs.js';
import {
    DOM_EVENT_CLICK,
    DOM_EVENT_KEYDOWN,
    DOM_EVENT_RESIZE,
    DOM_EVENT_SCROLL,
} from './utils/domEventNames.js';
import { KEY_ESCAPE, KEY_TAB } from './utils/keyboardKeys.js';

export { CATEGORY_GROUPS, categoryOptions } from './categoryData.js';

// Gestion des catégories de cartes

/** Entrée de deck avec catégories (pour logique pure). */
export interface DeckEntryWithCategories {
    name: string;
    quantity?: number;
    categories?: string[];
}

export type CreateCategorySelectorOptions = {
    /** Affiché quand aucune catégorie sélectionnée (ex. libellé « Catégories »). */
    placeholder?: string;
    /** Libellé lecteur d’écran ; défaut = placeholder ou « Catégories ». */
    ariaLabel?: string;
};

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
    /** Ferme la liste et la rattache au widget (appeler avant de détruire le conteneur parent). */
    teardown?: () => void;
}

export function isCategorySelectorElement(el: Element | null | undefined): el is CategorySelectorElement {
    return el != null && typeof (el as CategorySelectorElement).getCategories === 'function';
}

export function createCategorySelector(opts: CreateCategorySelectorOptions = {}): CategorySelectorElement {
    const placeholder = opts.placeholder?.trim() ?? '';
    const ariaLabel = (opts.ariaLabel ?? opts.placeholder ?? 'Catégories').trim() || 'Catégories';

    let catSelected: string[] = [];
    const container = document.createElement('div') as CategorySelectorElement;
    container.classList.add(CATEGORY_CONTAINER_CLASS);
    container.setAttribute(ARIA_LABEL_ATTR, ariaLabel);

    const display = document.createElement('div');
    display.className = CHIPS_CATEGORIES_CLASS;
    container.appendChild(display);
    const arrow = document.createElement('span');
    arrow.className = DROPDOWN_ARROW_CLASS;
    arrow.textContent = DROPDOWN_ARROW_TEXT;
    arrow.setAttribute(ARIA_HIDDEN_ATTR, 'true');

    const select = document.createElement('div');
    select.className = DROPDOWN_LIST_CLASS;
    categoryOptions.forEach((cat) => {
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

    function isDeckCardPopoverContext(): boolean {
        return container.closest(`.${DECK_CARD_POPOVER_ROOT_CLASS}`) != null;
    }

    function syncFloatingListGeometry(): void {
        if (!select.classList.contains(DROPDOWN_LIST_FLOATING_CLASS)) return;
        if (!select.classList.contains(DROPDOWN_LIST_VISIBLE_CLASS)) return;
        const rect = container.getBoundingClientRect();
        const gapPx = 4;
        const marginPx = 8;
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0;
        const belowTop = rect.bottom + gapPx;
        const spaceBelow = viewportH - belowTop - marginPx;
        const spaceAbove = rect.top - marginPx;
        const minComfortPx = 100;
        const openBelow = spaceBelow >= minComfortPx || spaceBelow >= spaceAbove;
        let topPx: number;
        let maxHPx: number;
        if (openBelow) {
            topPx = belowTop;
            maxHPx = Math.min(200, Math.max(72, spaceBelow));
        } else {
            maxHPx = Math.min(200, Math.max(72, spaceAbove - gapPx));
            topPx = rect.top - gapPx - maxHPx;
        }
        select.style.position = 'fixed';
        select.style.left = `${rect.left}px`;
        select.style.top = `${topPx}px`;
        select.style.width = `${rect.width}px`;
        select.style.maxHeight = `${maxHPx}px`;
        select.style.right = 'auto';
    }

    const onFloatingSync = (): void => {
        syncFloatingListGeometry();
    };

    container.addEventListener(DOM_EVENT_CLICK, () => {
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
        if (catSelected.length === 0 && placeholder) {
            const ph = document.createElement('span');
            ph.className = CHIPS_PLACEHOLDER_CLASS;
            ph.textContent = placeholder;
            display.appendChild(ph);
        }
        catSelected.forEach((value) => {
            const chip = document.createElement('span');
            chip.className = CATEGORY_CHIP_CLASS;
            chip.textContent = value;
            const btn = document.createElement('button');
            btn.setAttribute(BTN_TYPE_ATTR, BTN_TYPE_BUTTON);
            btn.textContent = CATEGORY_CHIP_REMOVE_BUTTON_TEXT;
            btn.onclick = (e) => {
                e.stopPropagation();
                removeChip(value);
            };
            chip.appendChild(btn);
            display.appendChild(chip);
        });
        display.appendChild(arrow);
        if (catSelected.length > 0) {
            const summary = catSelected.join(', ');
            container.title =
                summary.length > 120 ? `${ariaLabel} : ${summary.slice(0, 117)}…` : `${ariaLabel} : ${summary}`;
        } else {
            container.removeAttribute('title');
        }
    }
    function renderDropdown() {
        select.innerHTML = '';
        categoryOptions.forEach((opt) => {
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
        catSelected = catSelected.filter((val) => val !== value);
        renderChips();
    }
    function detachFloatingList(): void {
        if (!select.classList.contains(DROPDOWN_LIST_FLOATING_CLASS)) return;
        window.removeEventListener(DOM_EVENT_SCROLL, onFloatingSync, true);
        window.removeEventListener(DOM_EVENT_RESIZE, onFloatingSync);
        select.classList.remove(DROPDOWN_LIST_FLOATING_CLASS);
        container.appendChild(select);
        select.style.removeProperty('position');
        select.style.removeProperty('left');
        select.style.removeProperty('top');
        select.style.removeProperty('width');
        select.style.removeProperty('max-height');
        select.style.removeProperty('right');
    }

    function showDropdown(show: boolean) {
        if (show) {
            renderDropdown();
            if (isDeckCardPopoverContext()) {
                select.classList.add(DROPDOWN_LIST_FLOATING_CLASS);
                document.body.appendChild(select);
                window.addEventListener(DOM_EVENT_SCROLL, onFloatingSync, true);
                window.addEventListener(DOM_EVENT_RESIZE, onFloatingSync);
            }
            select.classList.add(DROPDOWN_LIST_VISIBLE_CLASS);
            if (select.classList.contains(DROPDOWN_LIST_FLOATING_CLASS)) {
                syncFloatingListGeometry();
            }
        } else {
            select.classList.remove(DROPDOWN_LIST_VISIBLE_CLASS);
            detachFloatingList();
        }
    }
    container.addCategory = function (cat: string) {
        addChip(cat);
    };
    container.setCategories = function (categories: string[]) {
        catSelected = [...categories];
        renderChips();
    };
    container.getCategories = function () {
        return [...catSelected];
    };
    container.removeCategory = function (cat: string) {
        removeChip(cat);
    };
    container.teardown = function () {
        showDropdown(false);
    };
    renderChips();
    return container;
}
