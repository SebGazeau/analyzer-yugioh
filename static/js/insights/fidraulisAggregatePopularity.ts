/**
 * Pastilles « popularité » (1–5) pour l’encart agrégat Fidraulis : normalisation sur le lot affiché.
 *
 * `Math.floor(t * 6)` : le score minimal du lot a toujours 0 pastille ; les scores très bas restent
 * souvent à 0–1 (proches maquette « tout gris » pour une carte peu vue).
 */
export function fidraulisAggregateLitPopDots(communityScore: number, scoresInBatch: readonly number[]): number {
    if (scoresInBatch.length === 0) return 0;
    const nums = scoresInBatch.map((n) => (Number.isFinite(n) ? n : 0));
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const s = Number.isFinite(communityScore) ? communityScore : 0;
    if (max <= min) {
        return s > 0 ? 5 : 0;
    }
    const t = (s - min) / (max - min);
    return Math.max(0, Math.min(5, Math.floor(t * 6)));
}

/** Pastille « basse » (couleur prudence) : popularité faible et biais heuristique dans les stats. */
export function fidraulisAggregatePopDotLow(
    litDots: number,
    synergyVerifiedPass: number,
    synergyHeuristicPass: number,
): boolean {
    return litDots <= 2 && synergyHeuristicPass > synergyVerifiedPass;
}
