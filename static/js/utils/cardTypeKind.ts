/**
 * Classe monstre / sort / piège à partir du champ `type` API (texte libre, insensible à la casse).
 * `null` si aucune sous-chaîne reconnue (stats agrégées : ignorer la ligne).
 */
export function cardTypeKindFromTypeStringOrNull(type: string | undefined): 'monster' | 'spell' | 'trap' | null {
    const t = (type ?? '').toLowerCase();
    if (t.includes('monster')) return 'monster';
    if (t.includes('spell')) return 'spell';
    if (t.includes('trap')) return 'trap';
    return null;
}

/** Pour recherche / grille : type inconnu → monstre (affichage). */
export function cardTypeKindFromTypeString(type: string | undefined): 'monster' | 'spell' | 'trap' {
    return cardTypeKindFromTypeStringOrNull(type) ?? 'monster';
}
