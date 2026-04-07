/**
 * Agrégats catégories / engines pour l’onglet Analysis (sans DOM).
 */

import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

export type CategoryEngineSummaryMap = Record<string, Map<string, number>>;

export interface MainRowForCategorySummary {
    name: string;
    quantity: number;
    engine: string;
    categories: string[];
}

export function cleanDeckCardDisplayName(s: string): string {
    return s.replace(new RegExp(`^${TEXT_EM_DASH}\\s*`), '').trim();
}

export function countNameOccurrences(names: readonly string[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const n of names) {
        m.set(n, (m.get(n) || 0) + 1);
    }
    return m;
}

/** Nombre de tirages « restants » pour les probas du tableau (même formule que l’historique stats). */
export function remainingDrawCountForProbTable(handSize: number, drawnPileLength: number): number {
    return Math.min(handSize, handSize - drawnPileLength);
}

export function buildFullDeckCategorySummaries(
    main: readonly MainRowForCategorySummary[],
    cleanName: (s: string) => string = cleanDeckCardDisplayName,
): {
    summary: CategoryEngineSummaryMap;
    engineSummary: CategoryEngineSummaryMap;
    totalCards: number;
} {
    const summary: CategoryEngineSummaryMap = {};
    const engineSummary: CategoryEngineSummaryMap = {};
    let totalCards = 0;
    for (const row of main) {
        const cardName = cleanName(row.name);
        const qty = row.quantity;
        const engine = row.engine;
        const selected = row.categories || [];
        if (!cardName || qty <= 0) continue;
        totalCards += qty;
        for (const cat of selected) {
            if (!summary[cat]) summary[cat] = new Map<string, number>();
            summary[cat].set(cardName, qty);
        }
        if (engine && engine.trim() !== '') {
            if (!engineSummary[engine]) engineSummary[engine] = new Map<string, number>();
            engineSummary[engine].set(cardName, qty);
        }
    }
    return { summary, engineSummary, totalCards };
}

export interface MainSnapshotRow {
    name: string;
    qty: number;
    engine: string;
    categories: string[];
}

export function buildRemainingDeckCategorySummaries(
    snapshot: readonly MainSnapshotRow[],
    drawnCounts: ReadonlyMap<string, number>,
    cleanName: (s: string) => string = cleanDeckCardDisplayName,
): {
    summary: CategoryEngineSummaryMap;
    engineSummary: CategoryEngineSummaryMap;
    totalCards: number;
} {
    const summary: CategoryEngineSummaryMap = {};
    const engineSummary: CategoryEngineSummaryMap = {};
    let totalCards = 0;
    for (const card of snapshot) {
        const drawn = drawnCounts.get(card.name) ?? 0;
        const remaining = Math.max(0, card.qty - drawn);
        if (remaining === 0) continue;
        totalCards += remaining;
        card.categories.forEach((cat: string) => {
            if (!summary[cat]) summary[cat] = new Map<string, number>();
            summary[cat].set(card.name, (summary[cat].get(card.name) || 0) + remaining);
        });
        if (card.engine && card.engine.trim() !== '') {
            if (!engineSummary[card.engine]) engineSummary[card.engine] = new Map<string, number>();
            engineSummary[card.engine].set(
                card.name,
                (engineSummary[card.engine].get(card.name) || 0) + remaining,
            );
        }
    }
    return { summary, engineSummary, totalCards };
}

export function pickFirstReferenceGroup(
    engineSummary: CategoryEngineSummaryMap,
    summary: CategoryEngineSummaryMap,
): { name: string; K: number } | null {
    const firstEngine = Object.entries(engineSummary).sort(([a], [b]) => a.localeCompare(b))[0];
    if (firstEngine) {
        const K = Array.from(firstEngine[1].values()).reduce((s, v) => s + v, 0);
        return { name: firstEngine[0], K };
    }
    const firstCat = Object.keys(summary).sort()[0];
    if (firstCat && summary[firstCat]) {
        const K = Array.from(summary[firstCat].values()).reduce((s, v) => s + v, 0);
        return { name: firstCat, K };
    }
    return null;
}

export function categoryEntriesSorted(summary: CategoryEngineSummaryMap): { name: string; K: number }[] {
    return Object.keys(summary)
        .sort()
        .map((name) => ({
            name,
            K: Array.from(summary[name].values()).reduce((s, v) => s + v, 0),
        }))
        .filter((e) => e.K > 0);
}
