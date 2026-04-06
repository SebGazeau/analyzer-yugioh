import {
    CARD_TYPE_KIND_MONSTER,
    CARD_TYPE_KIND_SPELL,
    CARD_TYPE_KIND_TRAP,
    type CardTypeKind,
} from './cardTypeKindConstants.js';

/**
 * Classe monstre / sort / piège à partir du champ `type` API (texte libre, insensible à la casse).
 * `null` si aucune sous-chaîne reconnue (stats agrégées : ignorer la ligne).
 */
export function cardTypeKindFromTypeStringOrNull(type: string | undefined): CardTypeKind | null {
    const t = (type ?? '').toLowerCase();
    if (t.includes('monster')) return CARD_TYPE_KIND_MONSTER;
    if (t.includes('spell')) return CARD_TYPE_KIND_SPELL;
    if (t.includes('trap')) return CARD_TYPE_KIND_TRAP;
    return null;
}

/** Pour recherche / grille : type inconnu → monstre (affichage). */
export function cardTypeKindFromTypeString(type: string | undefined): CardTypeKind {
    return cardTypeKindFromTypeStringOrNull(type) ?? CARD_TYPE_KIND_MONSTER;
}
