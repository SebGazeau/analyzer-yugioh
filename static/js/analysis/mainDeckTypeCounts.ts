/**
 * Comptage monstres / magies / pièges dans le Main (pur).
 */

import { cardTypeKindFromTypeStringOrNull } from '../utils/cardTypeKind.js';
import {
    CARD_TYPE_KIND_MONSTER,
    CARD_TYPE_KIND_SPELL,
} from '../utils/cardTypeKindConstants.js';

export interface MainDeckTypeCounts {
    monsters: number;
    spells: number;
    traps: number;
}

export function computeMainDeckTypeCounts(
    main: ReadonlyArray<{ type?: string; quantity: number }>,
): MainDeckTypeCounts {
    let monsters = 0;
    let spells = 0;
    let traps = 0;
    for (const row of main) {
        const kind = cardTypeKindFromTypeStringOrNull(row.type);
        if (kind === null) continue;
        const qty = row.quantity;
        if (kind === CARD_TYPE_KIND_MONSTER) monsters += qty;
        else if (kind === CARD_TYPE_KIND_SPELL) spells += qty;
        else traps += qty;
    }
    return { monsters, spells, traps };
}
