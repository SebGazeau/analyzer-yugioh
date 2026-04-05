/**
 * Popover « Modifier la carte » (quantité, engine, catégories, suppression, couverture).
 */
import { createCategorySelector } from '../../category.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR, ARIA_MODAL_ATTR } from '../../utils/ariaAttrs.js';
import { STYLE_DISPLAY_DEFAULT, STYLE_DISPLAY_NONE } from '../../utils/cssInlineDisplay.js';
import { cssLengthPx } from '../../utils/cssInlineLength.js';
import { ROLE_ATTR, ROLE_DIALOG } from '../../utils/htmlAttrs.js';
import {
    DECK_CARD_POPOVER_GAP_PX,
    DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX,
} from '../deckConstants.js';
import {
    deckLimitGroupKeyRow,
    maxAllowedForDeckLimitGroup,
    totalQtyDeckLimitGroup,
} from '../deckLimitGroups.js';
import type { DeckSection } from '../../deckSection.js';
import {
    deckCellSelector,
    DECK_CARD_QTY_DISPLAY_PREFIX,
    DECK_CARD_QTY_SELECTOR,
} from '../grid/deckGridDomSelectors.js';
import {
    DATA_DECK_POPOVER_BACKDROP_ATTR,
    DECK_CARD_POPOVER_ABOVE_CLASS,
    DECK_CARD_POPOVER_BACKDROP_CLASS,
    DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS,
    DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR,
    DECK_CARD_POPOVER_CLOSE_SELECTOR,
    DECK_CARD_POPOVER_COVER_SELECTOR,
    DECK_CARD_POPOVER_DELETE_SELECTOR,
    DECK_CARD_POPOVER_ENGINE_SELECTOR,
    DECK_CARD_POPOVER_OPEN_CLASS,
    DECK_CARD_POPOVER_QTY_LIMIT_CLASSES,
    DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX,
    DECK_CARD_POPOVER_QTY_SELECTOR,
    DECK_CARD_POPOVER_ROOT_CLASS,
} from './deckCardPopoverDomSelectors.js';
import { DECK_CARD_POPOVER_SHELL_HTML } from './deckCardPopoverShell.js';

export type { DeckSection };

/** Ligne deck telle qu’éditée dans le popover (champs mutables + limites). */
export interface DeckPopoverRow {
    name: string;
    quantity: number;
    engine: string;
    categories: string[];
    maxCopies?: number;
    cardId?: number;
    deckCopyId?: number;
    imageUrl?: string;
}

export interface CreateDeckCardPopoverDeps {
    getState: (section: DeckSection) => DeckPopoverRow[];
    allDeckRowsFlat: () => DeckPopoverRow[];
    renderDeckSection: (section: DeckSection) => void;
    /** Après changement de qty / engine / catégories / grille. */
    afterDeckDataChange: () => void;
    getCurrentLoadedDeck: () => { id: number; name: string } | null;
    setDeckCover: (deckId: number, imageUrl: string, name: string) => void;
    updateDeckOnServer: () => Promise<unknown>;
}

export interface DeckCardPopoverApi {
    openPopover(section: DeckSection, index: number, _anchor: HTMLElement): void;
    hide(): void;
    isOpen(): boolean;
    persistEdits(): void;
    getActiveCell(): { section: DeckSection; index: number } | null;
}

export function createDeckCardPopover(deps: CreateDeckCardPopoverDeps): DeckCardPopoverApi {
    const {
        getState,
        allDeckRowsFlat,
        renderDeckSection,
        afterDeckDataChange,
        getCurrentLoadedDeck,
        setDeckCover,
        updateDeckOnServer,
    } = deps;

    let popoverEl: HTMLElement | null = null;
    let popoverBackdropEl: HTMLElement | null = null;
    let popoverSection: DeckSection | null = null;
    let popoverIndex = -1;

    function isOpen(): boolean {
        return Boolean(popoverEl?.classList.contains(DECK_CARD_POPOVER_OPEN_CLASS));
    }

    function persistEdits(): void {
        if (!popoverEl || popoverSection == null || popoverIndex < 0) return;
        const qtySelect = popoverEl.querySelector(DECK_CARD_POPOVER_QTY_SELECTOR) as HTMLSelectElement | null;
        const engineSelect = popoverEl.querySelector(DECK_CARD_POPOVER_ENGINE_SELECTOR) as HTMLSelectElement | null;
        const catContainer = popoverEl.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement | null;
        const arr = getState(popoverSection);
        const row = arr[popoverIndex];
        if (!row) return;
        let newQty = parseInt(qtySelect?.value || '1', 10);
        const key = deckLimitGroupKeyRow(row);
        const flat = allDeckRowsFlat();
        const maxA = maxAllowedForDeckLimitGroup(flat, key, row.maxCopies ?? 3);
        const totalOthers = totalQtyDeckLimitGroup(flat, key) - row.quantity;
        const maxForThisRow = Math.min(row.maxCopies ?? 3, Math.max(1, maxA - totalOthers));
        if (newQty > maxForThisRow) newQty = maxForThisRow;
        if (newQty < 1) newQty = 1;
        row.quantity = newQty;
        if (qtySelect) qtySelect.value = String(newQty);
        row.engine = engineSelect?.value || '';
        if (catContainer?.firstElementChild && typeof (catContainer.firstElementChild as any).getCategories === 'function') {
            row.categories = (catContainer.firstElementChild as any).getCategories();
        }
        afterDeckDataChange();
        const cell = document.querySelector(deckCellSelector(popoverSection, popoverIndex));
        const badge = cell?.querySelector(DECK_CARD_QTY_SELECTOR);
        if (badge) badge.textContent = DECK_CARD_QTY_DISPLAY_PREFIX + row.quantity;
    }

    function hide(): void {
        popoverBackdropEl?.classList.remove(DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS);
        if (popoverEl) popoverEl.classList.remove(DECK_CARD_POPOVER_OPEN_CLASS);
        popoverSection = null;
        popoverIndex = -1;
    }

    function dismissSaving(): void {
        persistEdits();
        hide();
    }

    function repositionPopover(): void {
        if (!popoverEl || !popoverEl.classList.contains(DECK_CARD_POPOVER_OPEN_CLASS) || popoverSection == null || popoverIndex < 0)
            return;
        const anchor = document.querySelector(deckCellSelector(popoverSection, popoverIndex)) as HTMLElement | null;
        if (!anchor) {
            hide();
            return;
        }
        const rect = anchor.getBoundingClientRect();
        const popoverHeight = popoverEl.offsetHeight;
        const spaceBelow =
            window.innerHeight - rect.bottom - DECK_CARD_POPOVER_GAP_PX - DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX;
        const openAbove = spaceBelow < popoverHeight;

        popoverEl.style.left = cssLengthPx(rect.left);
        if (openAbove) {
            popoverEl.style.top = cssLengthPx(rect.top - popoverHeight - DECK_CARD_POPOVER_GAP_PX);
            popoverEl.classList.add(DECK_CARD_POPOVER_ABOVE_CLASS);
        } else {
            popoverEl.style.top = cssLengthPx(rect.bottom + DECK_CARD_POPOVER_GAP_PX);
            popoverEl.classList.remove(DECK_CARD_POPOVER_ABOVE_CLASS);
        }
    }

    function getOrCreatePopover(): HTMLElement {
        if (popoverEl) return popoverEl;

        popoverBackdropEl = document.createElement('div');
        popoverBackdropEl.className = DECK_CARD_POPOVER_BACKDROP_CLASS;
        popoverBackdropEl.setAttribute(DATA_DECK_POPOVER_BACKDROP_ATTR, '1');
        popoverBackdropEl.setAttribute(ARIA_HIDDEN_ATTR, 'true');
        document.body.appendChild(popoverBackdropEl);
        popoverBackdropEl.addEventListener('click', () => dismissSaving());

        popoverEl = document.createElement('div');
        popoverEl.className = DECK_CARD_POPOVER_ROOT_CLASS;
        popoverEl.setAttribute(ROLE_ATTR, ROLE_DIALOG);
        popoverEl.setAttribute(ARIA_MODAL_ATTR, 'true');
        popoverEl.setAttribute(ARIA_LABEL_ATTR, 'Modifier la carte');
        popoverEl.innerHTML = DECK_CARD_POPOVER_SHELL_HTML;
        document.body.appendChild(popoverEl);

        const qtySelect = popoverEl.querySelector(DECK_CARD_POPOVER_QTY_SELECTOR) as HTMLSelectElement;
        const engineSelect = popoverEl.querySelector(DECK_CARD_POPOVER_ENGINE_SELECTOR) as HTMLSelectElement;
        const catContainer = popoverEl.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement;
        const deleteBtn = popoverEl.querySelector(DECK_CARD_POPOVER_DELETE_SELECTOR);
        const closeBtn = popoverEl.querySelector(DECK_CARD_POPOVER_CLOSE_SELECTOR);
        const coverBtn = popoverEl.querySelector(DECK_CARD_POPOVER_COVER_SELECTOR);

        qtySelect?.addEventListener('change', () => persistEdits());
        engineSelect?.addEventListener('change', () => persistEdits());
        catContainer?.addEventListener('change', () => persistEdits());

        deleteBtn?.addEventListener('click', () => {
            if (popoverSection == null || popoverIndex < 0) return;
            persistEdits();
            const sec = popoverSection;
            const idx = popoverIndex;
            const arr = getState(sec);
            arr.splice(idx, 1);
            renderDeckSection(sec);
            afterDeckDataChange();
            hide();
        });

        closeBtn?.addEventListener('click', () => dismissSaving());
        coverBtn?.addEventListener('click', async () => {
            const deck = getCurrentLoadedDeck();
            if (popoverSection == null || popoverIndex < 0 || !deck) return;
            const arr = getState(popoverSection);
            const row = arr[popoverIndex];
            if (!row) return;
            persistEdits();
            setDeckCover(deck.id, row.imageUrl ?? '', row.name);
            hide();
            await updateDeckOnServer();
        });

        document.addEventListener('scroll', repositionPopover, true);
        window.addEventListener('resize', repositionPopover);

        if (document.documentElement.dataset.deckPopoverEscapeBound !== '1') {
            document.documentElement.dataset.deckPopoverEscapeBound = '1';
            document.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key !== 'Escape') return;
                if (!isOpen()) return;
                dismissSaving();
            });
        }

        return popoverEl;
    }

    function openPopover(section: DeckSection, index: number, _anchor: HTMLElement): void {
        const arr = getState(section);
        const row = arr[index];
        if (!row) return;
        if (isOpen() && (popoverSection !== section || popoverIndex !== index)) {
            persistEdits();
        }
        const popover = getOrCreatePopover();
        popoverSection = section;
        popoverIndex = index;

        const qtySelect = popover.querySelector(DECK_CARD_POPOVER_QTY_SELECTOR) as HTMLSelectElement;
        const engineSelect = popover.querySelector(DECK_CARD_POPOVER_ENGINE_SELECTOR) as HTMLSelectElement;
        const catContainer = popover.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement;
        if (qtySelect) {
            const key = deckLimitGroupKeyRow(row);
            const flat = allDeckRowsFlat();
            const maxA = maxAllowedForDeckLimitGroup(flat, key, row.maxCopies ?? 3);
            const totalOthers = totalQtyDeckLimitGroup(flat, key) - row.quantity;
            const cap = Math.min(row.maxCopies ?? 3, Math.max(1, maxA - totalOthers));
            qtySelect.innerHTML = '';
            for (let q = 1; q <= cap; q++) {
                const opt = document.createElement('option');
                opt.value = String(q);
                opt.textContent = String(q);
                qtySelect.appendChild(opt);
            }
            qtySelect.value = String(Math.min(row.quantity, cap));
            qtySelect.classList.remove(...DECK_CARD_POPOVER_QTY_LIMIT_CLASSES);
            const limit = row.maxCopies ?? 3;
            if (limit < 3) qtySelect.classList.add(`${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}${limit}`);
        }
        if (engineSelect) engineSelect.value = row.engine || '';
        if (catContainer) {
            catContainer.innerHTML = '';
            const selector = createCategorySelector();
            if (row.categories.length) (selector as any).setCategories?.(row.categories);
            catContainer.appendChild(selector);
        }

        const coverBtnEl = popover.querySelector(DECK_CARD_POPOVER_COVER_SELECTOR) as HTMLElement | null;
        if (coverBtnEl)
            coverBtnEl.style.display = getCurrentLoadedDeck() ? STYLE_DISPLAY_DEFAULT : STYLE_DISPLAY_NONE;

        popoverBackdropEl?.classList.add(DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS);
        popover.classList.add(DECK_CARD_POPOVER_OPEN_CLASS);
        repositionPopover();
    }

    function getActiveCell(): { section: DeckSection; index: number } | null {
        if (popoverSection == null || popoverIndex < 0) return null;
        return { section: popoverSection, index: popoverIndex };
    }

    return {
        openPopover,
        hide,
        isOpen,
        persistEdits,
        getActiveCell,
    };
}
