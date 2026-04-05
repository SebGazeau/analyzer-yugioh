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
        alert('Cette carte ne peut pas être placée dans l\'Extra Deck.');
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
        alert(`Zone pleine (max ${maxT} cartes).`);
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
    const el = document.querySelector('.deck-sections');
    if (!el || !(el instanceof HTMLElement)) return;
    const root = el;
    if (root.dataset.deckDndBound === '1') return;
    root.dataset.deckDndBound = '1';

    let suppressClickUntil = 0;

    root.addEventListener('dragstart', (e: DragEvent) => {
        const cell = (e.target as HTMLElement).closest('[data-deck-cell-section]');
        if (!cell || !e.dataTransfer) return;
        const section = cell.getAttribute('data-deck-cell-section') as DeckSection;
        const index = parseInt(cell.getAttribute('data-deck-cell-index') || '-1', 10);
        if (index < 0 || !isDeckSection(section)) return;
        e.dataTransfer.setData(dndPayloadType, JSON.stringify({ section, index }));
        e.dataTransfer.effectAllowed = 'move';
        cell.classList.add('deck-card-cell--dragging');
        hidePopover();
    });

    root.addEventListener('dragend', (e: DragEvent) => {
        (e.target as HTMLElement).closest('[data-deck-cell-section]')?.classList.remove('deck-card-cell--dragging');
        document.querySelectorAll('.deck-cards-grid--dnd-over').forEach((n) => n.classList.remove('deck-cards-grid--dnd-over'));
        suppressClickUntil = Date.now() + 200;
    });

    root.addEventListener(
        'click',
        (e: MouseEvent) => {
            if (Date.now() < suppressClickUntil && (e.target as HTMLElement).closest('.deck-sections')) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        true,
    );

    root.addEventListener('dragover', (e: DragEvent) => {
        const grid = (e.target as HTMLElement).closest('.deck-cards-grid');
        if (!grid || !e.dataTransfer?.types.includes(dndPayloadType)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.deck-cards-grid--dnd-over').forEach((n) => n.classList.remove('deck-cards-grid--dnd-over'));
        grid.classList.add('deck-cards-grid--dnd-over');
    });

    root.addEventListener('drop', (e: DragEvent) => {
        const grid = (e.target as HTMLElement).closest('.deck-cards-grid');
        if (!grid || !e.dataTransfer) return;
        e.preventDefault();
        grid.classList.remove('deck-cards-grid--dnd-over');
        const raw = e.dataTransfer.getData(dndPayloadType);
        if (!raw) return;
        let parsed: { section: DeckSection; index: number };
        try {
            parsed = JSON.parse(raw) as { section: DeckSection; index: number };
        } catch {
            return;
        }
        const { section: fromSection, index: fromIndex } = parsed;
        const dropSection = deckSectionForGridElementId(grid.id, gridIds);
        if (!dropSection) return;

        const hit = (e.target as HTMLElement).closest('[data-deck-cell-index]');
        const len = getSectionLength(dropSection);
        let dropOnIdx: number;
        if (hit && grid.contains(hit)) {
            dropOnIdx = parseInt(hit.getAttribute('data-deck-cell-index') || '0', 10);
        } else {
            dropOnIdx = len;
        }

        moveRow(fromSection, fromIndex, dropSection, dropOnIdx);
    });
}
