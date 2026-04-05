/**
 * Classe affichage monstre / sort / piège à partir du champ `type` API (texte libre, insensible à la casse).
 */
export function cardTypeKindFromTypeString(type: string | undefined): 'monster' | 'spell' | 'trap' {
    const t = (type ?? '').toLowerCase();
    if (t.includes('monster')) return 'monster';
    if (t.includes('spell')) return 'spell';
    if (t.includes('trap')) return 'trap';
    return 'monster';
}
