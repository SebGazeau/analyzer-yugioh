/**
 * Gabarit HTML statique d’une cellule carte dans les grilles main / extra / side.
 * Les attributs dynamiques (section, index, title) sont posés sur le nœud dans deckGridRender.
 */

import { escapeAttr } from '../../utils/html.js';

export interface DeckCardCellShellRow {
    imageUrl?: string;
    maxCopies?: number;
    quantity: number;
}

/** Contenu interne de `.deck-card-cell` (hors classe `--monster|spell|trap`). */
export function buildDeckCardCellInnerHtml(row: DeckCardCellShellRow): string {
    const thumbHtml = row.imageUrl
        ? `<img class="deck-card-thumb-img" src="${escapeAttr(row.imageUrl)}" alt="" loading="lazy" />`
        : '<span class="deck-card-thumb-placeholder">?</span>';
    const banBadge =
        row.maxCopies != null && row.maxCopies < 3
            ? `<span class="deck-card-ban-badge" title="Banlist TCG : max ${row.maxCopies} exemplaire(s)">lt. ${row.maxCopies}</span>`
            : '';
    return `
            <div class="deck-card-thumb">${thumbHtml}</div>
            ${banBadge}
            <button type="button" class="deck-card-remove-one" data-deck-action="remove-one" draggable="false" aria-label="Retirer 1 exemplaire" title="Retirer 1 exemplaire">
                <svg class="deck-card-remove-one-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12h16" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
                </svg>
            </button>
            <span class="deck-card-qty">x${row.quantity}</span>
        `;
}
