/**
 * Rendu des grilles de cartes du deck builder (DOM + événements par cellule).
 */
import type { DeckSection } from '../../deckSection.js';
import { DRAGGABLE_ATTR, DRAGGABLE_TRUE, TITLE_ATTR } from '../../utils/htmlAttrs.js';
import { DECK_ACTION_REMOVE_ONE_SELECTOR } from '../deckConstants.js';
import {
    DATA_DECK_CELL_INDEX_ATTR,
    DATA_DECK_CELL_SECTION_ATTR,
    deckCardCellWrapperClassName,
    DECK_CARD_REMOVE_ONE_BTN_SELECTOR,
} from './deckGridDomSelectors.js';
import { buildDeckCardCellInnerHtml, type DeckCardCellShellRow } from './deckCardCellShell.js';

export interface DeckGridRowForRender extends DeckCardCellShellRow {
    name: string;
    type: string;
}

export function renderDeckGridSection(
    section: DeckSection,
    gridId: string,
    rows: DeckGridRowForRender[],
    typeKind: (type: string) => 'monster' | 'spell' | 'trap',
    onRemoveOne: (section: DeckSection, index: number) => void,
    onOpenCell: (section: DeckSection, index: number, cell: HTMLElement) => void,
): void {
    const container = document.getElementById(gridId);
    if (!container) return;
    container.innerHTML = '';
    rows.forEach((row, index) => {
        const kind = typeKind(row.type);
        const cell = document.createElement('div');
        cell.className = deckCardCellWrapperClassName(kind);
        cell.setAttribute(DATA_DECK_CELL_SECTION_ATTR, section);
        cell.setAttribute(DATA_DECK_CELL_INDEX_ATTR, String(index));
        cell.setAttribute(TITLE_ATTR, row.name);
        cell.setAttribute(DRAGGABLE_ATTR, DRAGGABLE_TRUE);
        cell.innerHTML = buildDeckCardCellInnerHtml(row);
        cell.querySelector(DECK_CARD_REMOVE_ONE_BTN_SELECTOR)?.addEventListener('dragstart', (e) => e.preventDefault());
        cell.addEventListener('click', (e) => {
            const t = e.target as HTMLElement;
            if (t.closest(DECK_ACTION_REMOVE_ONE_SELECTOR)) {
                e.preventDefault();
                e.stopPropagation();
                onRemoveOne(section, index);
                return;
            }
            onOpenCell(section, index, cell);
        });
        container.appendChild(cell);
    });
}
