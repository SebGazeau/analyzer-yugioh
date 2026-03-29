/** Nombre max de vignettes rendues d’emblée par groupe (le reste via « Voir plus »). */
export const ASSOCIATIONS_MODAL_TILES_INITIAL = 48;

export function splitAssociationTileIdsForDisplay(
    cardIds: number[],
    initialMax = ASSOCIATIONS_MODAL_TILES_INITIAL,
): { visible: number[]; rest: number[] } {
    if (initialMax <= 0) return { visible: [], rest: [...cardIds] };
    if (cardIds.length <= initialMax) return { visible: [...cardIds], rest: [] };
    return {
        visible: cardIds.slice(0, initialMax),
        rest: cardIds.slice(initialMax),
    };
}
