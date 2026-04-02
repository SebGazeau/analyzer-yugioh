/**
 * Comptage monstres / magies / pièges dans le Main (pur).
 */

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
        const type = (row.type || '').toLowerCase();
        const qty = row.quantity;
        if (type.includes('monster')) monsters += qty;
        else if (type.includes('spell')) spells += qty;
        else if (type.includes('trap')) traps += qty;
    }
    return { monsters, spells, traps };
}
