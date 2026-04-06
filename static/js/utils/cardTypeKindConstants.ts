/**
 * Valeurs canoniques monstre / magie / piège (champ API `type`, grille, stats, filtre recherche hors « all »).
 * Doivent rester alignées sur `data-search-filter` (`templates/components/search-card.html`).
 */

export const CARD_TYPE_KIND_MONSTER = 'monster';
export const CARD_TYPE_KIND_SPELL = 'spell';
export const CARD_TYPE_KIND_TRAP = 'trap';

export type CardTypeKind =
    | typeof CARD_TYPE_KIND_MONSTER
    | typeof CARD_TYPE_KIND_SPELL
    | typeof CARD_TYPE_KIND_TRAP;
