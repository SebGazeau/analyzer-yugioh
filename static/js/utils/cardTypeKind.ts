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
    // Monstre avant sort/piège : le libellé peut contenir « spell » (ex. « Spell Tuner ») ou « trap » (ex. « Trap Monster »).
    // FR officiel (Konami) : « Monstre », « Carte Magie », « Carte Piège ».
    if (t.includes('monster') || t.includes('monstre')) return CARD_TYPE_KIND_MONSTER;
    if (t.includes('trap') || t.includes('piège') || t.includes('piege')) return CARD_TYPE_KIND_TRAP;
    if (t.includes('spell') || t.includes('magie')) return CARD_TYPE_KIND_SPELL;
    return null;
}

/** Pour recherche / grille : type inconnu → monstre (affichage). */
export function cardTypeKindFromTypeString(type: string | undefined): CardTypeKind {
    return cardTypeKindFromTypeStringOrNull(type) ?? CARD_TYPE_KIND_MONSTER;
}
