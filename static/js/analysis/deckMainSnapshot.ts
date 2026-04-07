/**
 * Vue Main Deck pour probas / simulation (sans lecture du DOM).
 */

export interface MainDeckProbabilitySnapshotRow {
    name: string;
    qty: number;
    engine: string;
    categories: string[];
}

export function buildMainDeckProbabilitySnapshot(
    main: ReadonlyArray<{
        name: string;
        quantity: number;
        engine?: string;
        categories?: string[];
    }>,
): MainDeckProbabilitySnapshotRow[] {
    return main
        .filter((r) => r.name && r.quantity > 0)
        .map((r) => ({
            name: r.name,
            qty: r.quantity,
            engine: r.engine || '',
            categories: r.categories || [],
        }));
}
