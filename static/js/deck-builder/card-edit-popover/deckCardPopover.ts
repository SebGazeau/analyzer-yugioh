/**
 * Popover « Modifier la carte » (quantité, engine, catégories, suppression, couverture, cartes associées).
 */
import { fetchCardByName } from '../../api.js';
import { openAssociatedCardsModal } from '../../associations/modal.js';
import { resolveDeckCardForAssociationName } from '../../associations/modalController.js';
import {
    buildCardArtBannerHtml,
    CARD_ART_BANNER_IMG_CLASS,
    cardArtBannerFrameHintFromType,
} from '../../components/cardArtBanner.js';
import { buildCardFicheBadgesInnerHtml } from '../../cardFicheBadges.js';
import { createCategorySelector, isCategorySelectorElement, type CategorySelectorElement } from '../../category.js';
import {
    ARIA_HIDDEN_ATTR,
    ARIA_LABEL_ATTR,
    ARIA_LABELLEDBY_ATTR,
    ARIA_MODAL_ATTR,
} from '../../utils/ariaAttrs.js';
import { STYLE_DISPLAY_DEFAULT, STYLE_DISPLAY_NONE } from '../../utils/cssInlineDisplay.js';
import { cssLengthPx } from '../../utils/cssInlineLength.js';
import { HTML_DATASET_VALUE_BOUND, ROLE_ATTR, ROLE_DIALOG } from '../../utils/htmlAttrs.js';
import {
    DOM_EVENT_CHANGE,
    DOM_EVENT_CLICK,
    DOM_EVENT_KEYDOWN,
    DOM_EVENT_RESIZE,
    DOM_EVENT_SCROLL,
} from '../../utils/domEventNames.js';
import { KEY_ESCAPE } from '../../utils/keyboardKeys.js';
import {
    DECK_CARD_POPOVER_GAP_PX,
    DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX,
    DECK_DEFAULT_MAX_COPIES_PER_CARD,
    DECK_DEFAULT_ROW_QUANTITY,
} from '../deckConstants.js';
import type { DeckSection } from '../../deckSectionOrder.js';
import {
    deckCellSelector,
    DECK_CARD_QTY_DISPLAY_PREFIX,
    DECK_CARD_QTY_SELECTOR,
} from '../grid/deckGridDomSelectors.js';
import {
    DATA_DECK_POPOVER_BACKDROP_ATTR,
    DATA_DECK_POPOVER_BACKDROP_PRESENCE_VALUE,
    DECK_CARD_POPOVER_ABOVE_CLASS,
    DECK_CARD_POPOVER_BACKDROP_CLASS,
    DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS,
    DECK_CARD_POPOVER_CATEGORIES_LABEL_ID,
    DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR,
    DECK_CARD_POPOVER_ART_BANNER_SELECTOR,
    DECK_CARD_POPOVER_ASSOCIATED_SELECTOR,
    DECK_CARD_POPOVER_BADGES_SELECTOR,
    DECK_CARD_POPOVER_CARD_NAME_SELECTOR,
    DECK_CARD_POPOVER_DESC_SELECTOR,
    DECK_CARD_POPOVER_CLOSE_SELECTOR,
    DECK_CARD_POPOVER_COVER_SELECTOR,
    DECK_CARD_POPOVER_DELETE_SELECTOR,
    DECK_CARD_POPOVER_ENGINE_SELECTOR,
    DECK_CARD_POPOVER_OPEN_CLASS,
    DECK_CARD_POPOVER_HEADING_TEXT,
    DECK_CARD_POPOVER_QTY_LIMIT_CLASSES,
    DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX,
    DECK_CARD_POPOVER_QTY_SELECTOR,
    DECK_CARD_POPOVER_ROOT_CLASS,
    DECK_CARD_POPOVER_TYPE_PRIMARY_SELECTOR,
    DECK_CARD_POPOVER_TYPE_SECONDARY_SELECTOR,
} from './deckCardPopoverDomSelectors.js';
import { DECK_CARD_POPOVER_SHELL_HTML } from './deckCardPopoverShell.js';
import {
    clampPopoverQuantityFromSelect,
    maxQuantityAllowedForPopoverRow,
} from './deckCardPopoverQuantity.js';
import {
    DECK_CARD_POPOVER_CATEGORIES_PLACEHOLDER,
    DECK_CARD_POPOVER_DESC_EMPTY_LABEL,
    DECK_CARD_POPOVER_LABEL_CATEGORIES,
} from './deckCardPopoverFormCopy.js';

function fillDeckCardPopoverHero(popover: HTMLElement, row: DeckPopoverRow): void {
    const bannerHost = popover.querySelector(DECK_CARD_POPOVER_ART_BANNER_SELECTOR) as HTMLElement | null;
    const nameEl = popover.querySelector(DECK_CARD_POPOVER_CARD_NAME_SELECTOR) as HTMLElement | null;
    const typePrimary = popover.querySelector(DECK_CARD_POPOVER_TYPE_PRIMARY_SELECTOR) as HTMLElement | null;
    const typeSecondary = popover.querySelector(DECK_CARD_POPOVER_TYPE_SECONDARY_SELECTOR) as HTMLElement | null;
    const badgesEl = popover.querySelector(DECK_CARD_POPOVER_BADGES_SELECTOR) as HTMLElement | null;
    const descEl = popover.querySelector(DECK_CARD_POPOVER_DESC_SELECTOR) as HTMLElement | null;
    if (!nameEl || !typePrimary || !typeSecondary || !badgesEl) return;

    const url = typeof row.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl.trim() : '';
    if (bannerHost) {
        bannerHost.innerHTML = buildCardArtBannerHtml(url, {
            alt: row.name,
            loading: 'eager',
            frameHint: cardArtBannerFrameHintFromType(row.type),
            variant: 'compact',
            rootClassExtra: 'deck-card-popover__art-banner',
        });
    }
    nameEl.textContent = row.name;
    const typeStr = (row.type ?? '').trim();
    typePrimary.textContent = typeStr;
    typePrimary.style.display = typeStr ? '' : 'none';
    const raceStr = (row.race ?? '').trim();
    typeSecondary.textContent = raceStr;
    typeSecondary.style.display = raceStr ? '' : 'none';
    badgesEl.innerHTML = buildCardFicheBadgesInnerHtml({
        type: row.type,
        level: row.level,
        attribute: row.attribute,
        atk: row.atk ?? null,
        def: row.def ?? null,
    });
    if (descEl) {
        const d = row.cardDesc?.trim();
        descEl.textContent = d || DECK_CARD_POPOVER_DESC_EMPTY_LABEL;
    }
}

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
    /** Méta affichage « fiche » (aligné sur `DeckRow`). */
    type?: string;
    race?: string;
    level?: number;
    attribute?: string;
    atk?: number;
    def?: number;
    cardDesc?: string;
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
        const flat = allDeckRowsFlat();
        const newQty = clampPopoverQuantityFromSelect(qtySelect?.value || String(DECK_DEFAULT_ROW_QUANTITY), row, flat);
        row.quantity = newQty;
        if (qtySelect) qtySelect.value = String(newQty);
        row.engine = engineSelect?.value || '';
        const catEl = catContainer?.firstElementChild;
        if (isCategorySelectorElement(catEl) && catEl.getCategories) {
            row.categories = catEl.getCategories();
        }
        afterDeckDataChange();
        const cell = document.querySelector(deckCellSelector(popoverSection, popoverIndex));
        const badge = cell?.querySelector(DECK_CARD_QTY_SELECTOR);
        if (badge) badge.textContent = DECK_CARD_QTY_DISPLAY_PREFIX + row.quantity;
    }

    function teardownOpenCategorySelector(): void {
        if (!popoverEl) return;
        const catHost = popoverEl.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement | null;
        const root = catHost?.firstElementChild as CategorySelectorElement | null;
        root?.teardown?.();
    }

    function hide(): void {
        teardownOpenCategorySelector();
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
        const margin = DECK_CARD_POPOVER_VIEWPORT_MARGIN_PX;
        const gap = DECK_CARD_POPOVER_GAP_PX;
        const rect = anchor.getBoundingClientRect();
        const popoverHeight = popoverEl.offsetHeight;
        const popoverWidth = popoverEl.offsetWidth;
        const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
        const openAbove = spaceBelow < popoverHeight;

        let top = openAbove ? rect.top - popoverHeight - gap : rect.bottom + gap;
        const maxTop = window.innerHeight - margin - popoverHeight;
        const minTop = margin;
        if (maxTop >= minTop) {
            top = Math.min(Math.max(top, minTop), maxTop);
        } else {
            top = minTop;
        }

        let left = rect.left;
        const maxLeft = window.innerWidth - margin - popoverWidth;
        const minLeft = margin;
        if (maxLeft >= minLeft) {
            left = Math.min(Math.max(left, minLeft), maxLeft);
        } else {
            left = minLeft;
        }

        popoverEl.style.left = cssLengthPx(left);
        popoverEl.style.top = cssLengthPx(top);
        if (openAbove) popoverEl.classList.add(DECK_CARD_POPOVER_ABOVE_CLASS);
        else popoverEl.classList.remove(DECK_CARD_POPOVER_ABOVE_CLASS);
    }

    function getOrCreatePopover(): HTMLElement {
        if (popoverEl) return popoverEl;

        popoverBackdropEl = document.createElement('div');
        popoverBackdropEl.className = DECK_CARD_POPOVER_BACKDROP_CLASS;
        popoverBackdropEl.setAttribute(DATA_DECK_POPOVER_BACKDROP_ATTR, DATA_DECK_POPOVER_BACKDROP_PRESENCE_VALUE);
        popoverBackdropEl.setAttribute(ARIA_HIDDEN_ATTR, 'true');
        document.body.appendChild(popoverBackdropEl);
        popoverBackdropEl.addEventListener(DOM_EVENT_CLICK, () => dismissSaving());

        popoverEl = document.createElement('div');
        popoverEl.className = DECK_CARD_POPOVER_ROOT_CLASS;
        popoverEl.setAttribute(ROLE_ATTR, ROLE_DIALOG);
        popoverEl.setAttribute(ARIA_MODAL_ATTR, 'true');
        popoverEl.setAttribute(ARIA_LABEL_ATTR, DECK_CARD_POPOVER_HEADING_TEXT);
        popoverEl.innerHTML = DECK_CARD_POPOVER_SHELL_HTML;
        document.body.appendChild(popoverEl);

        const qtySelect = popoverEl.querySelector(DECK_CARD_POPOVER_QTY_SELECTOR) as HTMLSelectElement;
        const engineSelect = popoverEl.querySelector(DECK_CARD_POPOVER_ENGINE_SELECTOR) as HTMLSelectElement;
        const catContainer = popoverEl.querySelector(DECK_CARD_POPOVER_CAT_CONTAINER_SELECTOR) as HTMLElement;
        const deleteBtn = popoverEl.querySelector(DECK_CARD_POPOVER_DELETE_SELECTOR);
        const closeBtn = popoverEl.querySelector(DECK_CARD_POPOVER_CLOSE_SELECTOR);
        const coverBtn = popoverEl.querySelector(DECK_CARD_POPOVER_COVER_SELECTOR);
        const associatedBtn = popoverEl.querySelector(DECK_CARD_POPOVER_ASSOCIATED_SELECTOR);

        qtySelect?.addEventListener(DOM_EVENT_CHANGE, () => persistEdits());
        engineSelect?.addEventListener(DOM_EVENT_CHANGE, () => persistEdits());
        catContainer?.addEventListener(DOM_EVENT_CHANGE, () => persistEdits());

        deleteBtn?.addEventListener(DOM_EVENT_CLICK, () => {
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

        closeBtn?.addEventListener(DOM_EVENT_CLICK, () => dismissSaving());
        associatedBtn?.addEventListener(DOM_EVENT_CLICK, (e) => {
            e.stopPropagation();
            if (popoverSection == null || popoverIndex < 0) return;
            persistEdits();
            const sec = popoverSection;
            const idx = popoverIndex;
            const arr = getState(sec);
            const row = arr[idx];
            hide();
            if (!row) return;
            void (async () => {
                if (row.cardId != null) {
                    const raw: Record<string, unknown> = {
                        id: row.cardId,
                        name: row.name,
                    };
                    if (row.imageUrl) raw.image_url = row.imageUrl;
                    await openAssociatedCardsModal(raw);
                    return;
                }
                const card = await resolveDeckCardForAssociationName(row.name);
                if (!card) {
                    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                        console.warn('[deck-card-popover] Carte introuvable pour les associations :', row.name);
                    }
                    return;
                }
                await openAssociatedCardsModal(card as Record<string, unknown>);
            })();
        });
        coverBtn?.addEventListener(DOM_EVENT_CLICK, async () => {
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

        document.addEventListener(DOM_EVENT_SCROLL, repositionPopover, true);
        window.addEventListener(DOM_EVENT_RESIZE, repositionPopover);

        if (document.documentElement.dataset.deckPopoverEscapeBound !== HTML_DATASET_VALUE_BOUND) {
            document.documentElement.dataset.deckPopoverEscapeBound = HTML_DATASET_VALUE_BOUND;
            document.addEventListener(DOM_EVENT_KEYDOWN, (e: KeyboardEvent) => {
                if (e.key !== KEY_ESCAPE) return;
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
            const flat = allDeckRowsFlat();
            const cap = maxQuantityAllowedForPopoverRow(row, flat);
            qtySelect.innerHTML = '';
            for (let q = DECK_DEFAULT_ROW_QUANTITY; q <= cap; q++) {
                const opt = document.createElement('option');
                opt.value = String(q);
                opt.textContent = String(q);
                qtySelect.appendChild(opt);
            }
            qtySelect.value = String(Math.min(row.quantity, cap));
            qtySelect.classList.remove(...DECK_CARD_POPOVER_QTY_LIMIT_CLASSES);
            const limit = row.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD;
            if (limit < DECK_DEFAULT_MAX_COPIES_PER_CARD)
                qtySelect.classList.add(`${DECK_CARD_POPOVER_QTY_LIMIT_CLASS_PREFIX}${limit}`);
        }
        if (engineSelect) engineSelect.value = row.engine || '';
        if (catContainer) {
            const prevRoot = catContainer.firstElementChild as CategorySelectorElement | null;
            prevRoot?.teardown?.();
            catContainer.innerHTML = '';
            const selector = createCategorySelector({
                placeholder: DECK_CARD_POPOVER_CATEGORIES_PLACEHOLDER,
                ariaLabel: DECK_CARD_POPOVER_LABEL_CATEGORIES,
            });
            if (row.categories.length) selector.setCategories?.(row.categories);
            selector.setAttribute(ARIA_LABELLEDBY_ATTR, DECK_CARD_POPOVER_CATEGORIES_LABEL_ID);
            catContainer.appendChild(selector);
        }

        const coverBtnEl = popover.querySelector(DECK_CARD_POPOVER_COVER_SELECTOR) as HTMLElement | null;
        if (coverBtnEl)
            coverBtnEl.style.display = getCurrentLoadedDeck() ? STYLE_DISPLAY_DEFAULT : STYLE_DISPLAY_NONE;

        fillDeckCardPopoverHero(popover, row);

        const bannerImg = popover.querySelector(
            `.deck-card-popover__art-banner .${CARD_ART_BANNER_IMG_CLASS}`,
        ) as HTMLImageElement | null;
        if (bannerImg) {
            if (bannerImg.complete) requestAnimationFrame(() => repositionPopover());
            else bannerImg.addEventListener('load', () => repositionPopover(), { once: true });
        }

        const nameForDesc = row.name.trim();
        if (!row.cardDesc?.trim() && nameForDesc) {
            void fetchCardByName(nameForDesc).then((c) => {
                if (!popover.classList.contains(DECK_CARD_POPOVER_OPEN_CLASS)) return;
                const arrNow = getState(section);
                if (arrNow[index] !== row) return;
                const d = typeof c?.desc === 'string' ? c.desc.trim() : '';
                if (d) row.cardDesc = d;
                const descHost = popover.querySelector(DECK_CARD_POPOVER_DESC_SELECTOR) as HTMLElement | null;
                if (descHost) {
                    descHost.textContent =
                        (row.cardDesc || '').trim() || DECK_CARD_POPOVER_DESC_EMPTY_LABEL;
                }
                requestAnimationFrame(() => repositionPopover());
            });
        }

        popoverBackdropEl?.classList.add(DECK_CARD_POPOVER_BACKDROP_OPEN_CLASS);
        popover.classList.add(DECK_CARD_POPOVER_OPEN_CLASS);
        repositionPopover();
        requestAnimationFrame(() => repositionPopover());
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
