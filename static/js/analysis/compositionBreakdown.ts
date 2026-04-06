/**
 * Répartition Main Deck : monstres / magies / pièges (logique d’agrégation).
 */

import { compositionBreakdownLevelBucketKey } from './compositionBreakdownCopy.js';
import { cardTypeKindFromTypeStringOrNull } from '../utils/cardTypeKind.js';
import {
    CARD_TYPE_KIND_MONSTER,
    CARD_TYPE_KIND_SPELL,
    CARD_TYPE_KIND_TRAP,
} from '../utils/cardTypeKindConstants.js';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

export interface CompositionBreakdown {
    monsters: {
        byAttribute: Record<string, number>;
        byLevel: Record<string, number>;
        byRace: Record<string, number>;
    };
    spells: { byRace: Record<string, number> };
    traps: { byRace: Record<string, number> };
}

/** Champs minimaux lus depuis une ligne Main Deck. */
export interface CompositionBreakdownRow {
    type?: string;
    quantity: number;
    attribute?: string;
    level?: number | null;
    race?: string;
}

export function computeCompositionBreakdown(main: CompositionBreakdownRow[]): CompositionBreakdown {
    const monsters = {
        byAttribute: {} as Record<string, number>,
        byLevel: {} as Record<string, number>,
        byRace: {} as Record<string, number>,
    };
    const spells = { byRace: {} as Record<string, number> };
    const traps = { byRace: {} as Record<string, number> };

    main.forEach((row) => {
        const kind = cardTypeKindFromTypeStringOrNull(row.type);
        if (kind === null) return;
        const qty = row.quantity;
        const key = (v: string) => v || TEXT_EM_DASH;
        if (kind === CARD_TYPE_KIND_MONSTER) {
            const attr = key(row.attribute ?? '');
            monsters.byAttribute[attr] = (monsters.byAttribute[attr] || 0) + qty;
            const lvl = row.level != null ? compositionBreakdownLevelBucketKey(row.level) : TEXT_EM_DASH;
            monsters.byLevel[lvl] = (monsters.byLevel[lvl] || 0) + qty;
            const race = key(row.race ?? '');
            monsters.byRace[race] = (monsters.byRace[race] || 0) + qty;
        } else if (kind === CARD_TYPE_KIND_SPELL) {
            const race = key(row.race ?? '');
            spells.byRace[race] = (spells.byRace[race] || 0) + qty;
        } else if (kind === CARD_TYPE_KIND_TRAP) {
            const race = key(row.race ?? '');
            traps.byRace[race] = (traps.byRace[race] || 0) + qty;
        }
    });

    return { monsters, spells, traps };
}

export { buildCompositionDetailPanelsHtml } from './compositionBreakdownHtml.js';
