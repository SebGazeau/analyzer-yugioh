/**
 * Popover « Modifier la carte » (quantité, engine, catégories, suppression, couverture).
 */
import { createCategorySelector } from '../../category.js';
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
        return Boolean(popoverEl?.classList.contains('deck-card-popover--open'));
    }

    function persistEdits(): void {
        if (!popoverEl || popoverSection == null || popoverIndex < 0) return;
        const qtySelect = popoverEl.querySelector('.deck-card-popover-qty') as HTMLSelectElement | null;
        const engineSelect = popoverEl.querySelector('.deck-card-popover-engine') as HTMLSelectElement | null;
        const catContainer = popoverEl.querySelector('.deck-card-popover-cat-container') as HTMLElement | null;
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
        const cell = document.querySelector(
            `[data-deck-cell-section="${popoverSection}"][data-deck-cell-index="${popoverIndex}"]`,
        );
        const badge = cell?.querySelector('.deck-card-qty');
        if (badge) badge.textContent = 'x' + row.quantity;
    }

    function hide(): void {
        popoverBackdropEl?.classList.remove('deck-card-popover-backdrop--open');
        if (popoverEl) popoverEl.classList.remove('deck-card-popover--open');
        popoverSection = null;
        popoverIndex = -1;
    }

    function dismissSaving(): void {
        persistEdits();
        hide();
    }

    function repositionPopover(): void {
        if (!popoverEl || !popoverEl.classList.contains('deck-card-popover--open') || popoverSection == null || popoverIndex < 0)
            return;
        const anchor = document.querySelector(
            `[data-deck-cell-section="${popoverSection}"][data-deck-cell-index="${popoverIndex}"]`,
        ) as HTMLElement | null;
        if (!anchor) {
            hide();
            return;
        }
        const rect = anchor.getBoundingClientRect();
        const popoverHeight = popoverEl.offsetHeight;
        const spaceBelow =
            window.innerHeight - rect.bottom - DECK_CARD_POPOVER_GAP_PX - DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX;
        const openAbove = spaceBelow < popoverHeight;

        popoverEl.style.left = `${rect.left}px`;
        if (openAbove) {
            popoverEl.style.top = `${rect.top - popoverHeight - DECK_CARD_POPOVER_GAP_PX}px`;
            popoverEl.classList.add('deck-card-popover--above');
        } else {
            popoverEl.style.top = `${rect.bottom + DECK_CARD_POPOVER_GAP_PX}px`;
            popoverEl.classList.remove('deck-card-popover--above');
        }
    }

    function getOrCreatePopover(): HTMLElement {
        if (popoverEl) return popoverEl;

        popoverBackdropEl = document.createElement('div');
        popoverBackdropEl.className = 'deck-card-popover-backdrop';
        popoverBackdropEl.setAttribute('data-deck-popover-backdrop', '1');
        popoverBackdropEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(popoverBackdropEl);
        popoverBackdropEl.addEventListener('click', () => dismissSaving());

        popoverEl = document.createElement('div');
        popoverEl.className = 'deck-card-popover';
        popoverEl.setAttribute('role', 'dialog');
        popoverEl.setAttribute('aria-modal', 'true');
        popoverEl.setAttribute('aria-label', 'Modifier la carte');
        popoverEl.innerHTML = DECK_CARD_POPOVER_SHELL_HTML;
        document.body.appendChild(popoverEl);

        const qtySelect = popoverEl.querySelector('.deck-card-popover-qty') as HTMLSelectElement;
        const engineSelect = popoverEl.querySelector('.deck-card-popover-engine') as HTMLSelectElement;
        const catContainer = popoverEl.querySelector('.deck-card-popover-cat-container') as HTMLElement;
        const deleteBtn = popoverEl.querySelector('.deck-card-popover-delete');
        const closeBtn = popoverEl.querySelector('.deck-card-popover-close');
        const coverBtn = popoverEl.querySelector('.deck-card-popover-cover');

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

        const qtySelect = popover.querySelector('.deck-card-popover-qty') as HTMLSelectElement;
        const engineSelect = popover.querySelector('.deck-card-popover-engine') as HTMLSelectElement;
        const catContainer = popover.querySelector('.deck-card-popover-cat-container') as HTMLElement;
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
            qtySelect.classList.remove('deck-card-popover-qty--limit-0', 'deck-card-popover-qty--limit-1', 'deck-card-popover-qty--limit-2');
            const limit = row.maxCopies ?? 3;
            if (limit < 3) qtySelect.classList.add(`deck-card-popover-qty--limit-${limit}`);
        }
        if (engineSelect) engineSelect.value = row.engine || '';
        if (catContainer) {
            catContainer.innerHTML = '';
            const selector = createCategorySelector();
            if (row.categories.length) (selector as any).setCategories?.(row.categories);
            catContainer.appendChild(selector);
        }

        const coverBtnEl = popover.querySelector('.deck-card-popover-cover') as HTMLElement | null;
        if (coverBtnEl) coverBtnEl.style.display = getCurrentLoadedDeck() ? '' : 'none';

        popoverBackdropEl?.classList.add('deck-card-popover-backdrop--open');
        popover.classList.add('deck-card-popover--open');
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
