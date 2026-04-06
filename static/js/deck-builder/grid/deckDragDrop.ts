/**
 * Déplacement de lignes (DND) entre zones main / extra / side.
 */
import {
    maxCardsForZone,
    resolveTargetZone,
    sameZoneInsertIndex,
    sumQuantities,
    type DeckRowLike,
} from '../../deck-move.js';
import { deckSectionForGridElementId } from '../deckConstants.js';
import { isDeckSection, type DeckSection } from '../../deckSection.js';
import {
    DECK_CARD_CELL_DRAGGING_CLASS,
    DECK_CARDS_GRID_DND_OVER_CLASS,
    DECK_CARDS_GRID_DND_OVER_SELECTOR,
    DECK_CARDS_GRID_SELECTOR,
    DECK_CELL_HAS_INDEX_SELECTOR,
    DECK_CELL_HAS_SECTION_SELECTOR,
    DECK_SECTIONS_ROOT_SELECTOR,
    DATA_DECK_CELL_INDEX_ATTR,
    DATA_DECK_CELL_SECTION_ATTR,
} from './deckGridDomSelectors.js';
import {
    DOM_EVENT_CLICK,
    DOM_EVENT_DRAGEND,
    DOM_EVENT_DRAGOVER,
    DOM_EVENT_DRAGSTART,
    DOM_EVENT_DROP,
} from '../../utils/domEventNames.js';
import { MSG_DECK_EXTRA_PLACEMENT_FORBIDDEN, msgDeckZoneFull } from '../../utils/userDialogMessages.js';

export function parseDeckCellDragPayload(raw: string): { section: DeckSection; index: number } | null {
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    if (data === null || typeof data !== 'object') return null;
    const rec = data as { section?: unknown; index?: unknown };
    if (typeof rec.section !== 'string' || !isDeckSection(rec.section)) return null;
    const section = rec.section;
    if (typeof rec.index !== 'number' || !Number.isFinite(rec.index)) return null;
    const index = Math.trunc(rec.index);
    if (index < 0) return null;
    return { section, index };
}

export interface DeckDragMoveContext<D extends DeckRowLike = DeckRowLike> {
    getState: (section: DeckSection) => D[];
    renderSection: (section: DeckSection) => void;
    afterStructureChange: () => void;
}

/**
 * Déplace une ligne (réordonnancement ou changement de zone).
 * @param dropOnIndex insérer avant cette position ; utiliser `length` pour la fin.
 */
export function executeDeckRowMove<D extends DeckRowLike>(
    fromSection: DeckSection,
    fromIndex: number,
    dropSection: DeckSection,
    dropOnIndex: number,
    ctx: DeckDragMoveContext<D>,
): boolean {
    const { getState, renderSection, afterStructureChange } = ctx;
    const fromArr = getState(fromSection);
    const row = fromArr[fromIndex];
    if (!row) return false;

    const resolved = resolveTargetZone(row, dropSection);
    if (resolved === null) {
        alert(MSG_DECK_EXTRA_PLACEMENT_FORBIDDEN);
        return false;
    }

    if (fromSection === resolved) {
        const arr = getState(resolved);
        const len = arr.length;
        const [moved] = arr.splice(fromIndex, 1);
        if (dropSection !== fromSection) {
            arr.push(moved);
        } else {
            const ins = sameZoneInsertIndex(fromIndex, Math.min(dropOnIndex, len), len);
            if (ins === null) {
                arr.splice(fromIndex, 0, moved);
                return false;
            }
            arr.splice(ins, 0, moved);
        }
        renderSection(resolved);
        afterStructureChange();
        return true;
    }

    const fromA = getState(fromSection);
    const toA = getState(resolved);
    const maxT = maxCardsForZone(resolved);
    if (sumQuantities(toA) + row.quantity > maxT) {
        alert(msgDeckZoneFull(maxT));
        return false;
    }

    const [moved] = fromA.splice(fromIndex, 1);
    let ins = dropSection === resolved ? Math.max(0, Math.min(dropOnIndex, toA.length)) : toA.length;
    ins = Math.max(0, Math.min(ins, toA.length));
    toA.splice(ins, 0, moved);

    renderSection(fromSection);
    renderSection(resolved);
    afterStructureChange();
    return true;
}

export interface BindDeckDragAndDropOptions {
    moveRow: (
        fromSection: DeckSection,
        fromIndex: number,
        dropSection: DeckSection,
        dropOnIndex: number,
    ) => boolean;
    hidePopover: () => void;
    getSectionLength: (section: DeckSection) => number;
    gridIds: Record<DeckSection, string>;
    dndPayloadType: string;
}

/** Branche drag-and-drop sur `.deck-sections` (délégation, survit aux re-rendus de grille). */
export function bindDeckDragAndDropRoot(options: BindDeckDragAndDropOptions): void {
    const { moveRow, hidePopover, getSectionLength, gridIds, dndPayloadType } = options;
    const el = document.querySelector(DECK_SECTIONS_ROOT_SELECTOR);
    if (!el || !(el instanceof HTMLElement)) return;
    const root = el;
    if (root.dataset.deckDndBound === '1') return;
    root.dataset.deckDndBound = '1';

    let suppressClickUntil = 0;

    root.addEventListener(DOM_EVENT_DRAGSTART, (e: DragEvent) => {
        const cell = (e.target as HTMLElement).closest(DECK_CELL_HAS_SECTION_SELECTOR);
        if (!cell || !e.dataTransfer) return;
        const section = cell.getAttribute(DATA_DECK_CELL_SECTION_ATTR) as DeckSection;
        const index = parseInt(cell.getAttribute(DATA_DECK_CELL_INDEX_ATTR) || '-1', 10);
        if (index < 0 || !isDeckSection(section)) return;
        e.dataTransfer.setData(dndPayloadType, JSON.stringify({ section, index }));
        e.dataTransfer.effectAllowed = 'move';
        cell.classList.add(DECK_CARD_CELL_DRAGGING_CLASS);
        hidePopover();
    });

    root.addEventListener(DOM_EVENT_DRAGEND, (e: DragEvent) => {
        (e.target as HTMLElement).closest(DECK_CELL_HAS_SECTION_SELECTOR)?.classList.remove(DECK_CARD_CELL_DRAGGING_CLASS);
        document.querySelectorAll(DECK_CARDS_GRID_DND_OVER_SELECTOR).forEach((n) => n.classList.remove(DECK_CARDS_GRID_DND_OVER_CLASS));
        suppressClickUntil = Date.now() + 200;
    });

    root.addEventListener(
        DOM_EVENT_CLICK,
        (e: MouseEvent) => {
            if (Date.now() < suppressClickUntil && (e.target as HTMLElement).closest(DECK_SECTIONS_ROOT_SELECTOR)) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        true,
    );

    root.addEventListener(DOM_EVENT_DRAGOVER, (e: DragEvent) => {
        const grid = (e.target as HTMLElement).closest(DECK_CARDS_GRID_SELECTOR);
        if (!grid || !e.dataTransfer?.types.includes(dndPayloadType)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll(DECK_CARDS_GRID_DND_OVER_SELECTOR).forEach((n) => n.classList.remove(DECK_CARDS_GRID_DND_OVER_CLASS));
        grid.classList.add(DECK_CARDS_GRID_DND_OVER_CLASS);
    });

    root.addEventListener(DOM_EVENT_DROP, (e: DragEvent) => {
        const grid = (e.target as HTMLElement).closest(DECK_CARDS_GRID_SELECTOR);
        if (!grid || !e.dataTransfer) return;
        e.preventDefault();
        grid.classList.remove(DECK_CARDS_GRID_DND_OVER_CLASS);
        const raw = e.dataTransfer.getData(dndPayloadType);
        if (!raw) return;
        const parsed = parseDeckCellDragPayload(raw);
        if (!parsed) return;
        const { section: fromSection, index: fromIndex } = parsed;
        const dropSection = deckSectionForGridElementId(grid.id, gridIds);
        if (!dropSection) return;

        const hit = (e.target as HTMLElement).closest(DECK_CELL_HAS_INDEX_SELECTOR);
        const len = getSectionLength(dropSection);
        let dropOnIdx: number;
        if (hit && grid.contains(hit)) {
            dropOnIdx = parseInt(hit.getAttribute(DATA_DECK_CELL_INDEX_ATTR) || '0', 10);
        } else {
            dropOnIdx = len;
        }

        moveRow(fromSection, fromIndex, dropSection, dropOnIdx);
    });
}
