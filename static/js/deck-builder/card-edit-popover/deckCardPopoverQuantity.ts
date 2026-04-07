/**
 * Plafonds d’exemplaires pour le popover deck (règles banlist / groupe), sans DOM.
 */
import { DECK_DEFAULT_MAX_COPIES_PER_CARD, DECK_DEFAULT_ROW_QUANTITY } from '../deckConstants.js';
import {
    deckLimitGroupKeyRow,
    maxAllowedForDeckLimitGroup,
    totalQtyDeckLimitGroup,
    type DeckRowLimitFields,
} from '../deckLimitGroups.js';
import { INTEGER_STRING_DECIMAL_RADIX } from '../../utils/numberParse.js';

/** Quantité max sélectionnable pour cette ligne compte tenu du reste du deck. */
export function maxQuantityAllowedForPopoverRow(
    row: DeckRowLimitFields,
    flat: readonly DeckRowLimitFields[],
): number {
    const key = deckLimitGroupKeyRow(row);
    const maxA = maxAllowedForDeckLimitGroup(flat, key, row.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD);
    const totalOthers = totalQtyDeckLimitGroup(flat, key) - row.quantity;
    return Math.min(
        row.maxCopies ?? DECK_DEFAULT_MAX_COPIES_PER_CARD,
        Math.max(DECK_DEFAULT_ROW_QUANTITY, maxA - totalOthers),
    );
}

/** Ajuste une quantité lue depuis un &lt;select&gt; aux limites du deck. */
export function clampPopoverQuantityFromSelect(
    selectValue: string,
    row: DeckRowLimitFields,
    flat: readonly DeckRowLimitFields[],
): number {
    let newQty = parseInt(selectValue || String(DECK_DEFAULT_ROW_QUANTITY), INTEGER_STRING_DECIMAL_RADIX);
    const maxForThisRow = maxQuantityAllowedForPopoverRow(row, flat);
    if (newQty > maxForThisRow) newQty = maxForThisRow;
    if (newQty < DECK_DEFAULT_ROW_QUANTITY) newQty = DECK_DEFAULT_ROW_QUANTITY;
    return newQty;
}
