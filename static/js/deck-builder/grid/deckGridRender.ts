/**
 * Rendu des grilles de cartes du deck builder (DOM + événements par cellule).
 */
import type { DeckSection } from '../../deckSection.js';
import { buildDeckCardCellInnerHtml, type DeckCardCellShellRow } from './deckCardCellShell.js';

export type DeckGridSection = DeckSection;

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
        cell.className = `deck-card-cell deck-card-cell--${kind}`;
        cell.setAttribute('data-deck-cell-section', section);
        cell.setAttribute('data-deck-cell-index', String(index));
        cell.setAttribute('title', row.name);
        cell.setAttribute('draggable', 'true');
        cell.innerHTML = buildDeckCardCellInnerHtml(row);
        cell.querySelector('.deck-card-remove-one')?.addEventListener('dragstart', (e) => e.preventDefault());
        cell.addEventListener('click', (e) => {
            const t = e.target as HTMLElement;
            if (t.closest('[data-deck-action="remove-one"]')) {
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
