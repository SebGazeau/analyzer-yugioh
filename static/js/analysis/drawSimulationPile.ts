/**
 * Pile de noms restants pour la simulation de tirage (une entrée par copie).
 */

export interface DrawPileSnapshotRow {
    name: string;
    qty: number;
}

/** Liste plate des noms encore dans le deck (quantités − déjà tirées). */
export function buildRemainingDrawPool(
    snapshot: ReadonlyArray<DrawPileSnapshotRow>,
    drawnPerName: ReadonlyMap<string, number>,
): string[] {
    const deck: string[] = [];
    for (const card of snapshot) {
        const drawn = drawnPerName.get(card.name) ?? 0;
        const remaining = Math.max(0, card.qty - drawn);
        for (let i = 0; i < remaining; i++) deck.push(card.name);
    }
    return deck;
}

export function pickRandomFromPool(pool: string[], rng: () => number = Math.random): string | null {
    if (pool.length === 0) return null;
    const idx = Math.floor(rng() * pool.length);
    return pool[idx] ?? null;
}
