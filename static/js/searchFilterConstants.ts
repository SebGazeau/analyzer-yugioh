/**
 * Valeurs de `data-search-filter` (widget recherche builder).
 * Doivent rester alignées sur `templates/components/search-card.html`.
 */

import type { CardTypeKind } from './utils/cardTypeKindConstants.js';
import {
    CARD_TYPE_KIND_MONSTER,
    CARD_TYPE_KIND_SPELL,
    CARD_TYPE_KIND_TRAP,
} from './utils/cardTypeKindConstants.js';

export const SEARCH_FILTER_ALL = 'all';
export const SEARCH_FILTER_MONSTER = CARD_TYPE_KIND_MONSTER;
export const SEARCH_FILTER_SPELL = CARD_TYPE_KIND_SPELL;
export const SEARCH_FILTER_TRAP = CARD_TYPE_KIND_TRAP;

export type SearchFilter = typeof SEARCH_FILTER_ALL | CardTypeKind;
