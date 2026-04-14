import type { DeckInsight, InsightDeckSnapshot } from './types.js';
import { computeFidraulisGyResourcesInsight } from './fidraulisGy.js';
import { computeSeventhTachyonInsight } from './seventhTachyon.js';

/**
 * Agrège toutes les règles d’insights sur un snapshot de deck (logique pure).
 */
export function collectDeckInsights(deck: InsightDeckSnapshot): DeckInsight[] {
    const out: DeckInsight[] = [];
    const st = computeSeventhTachyonInsight(deck);
    if (st) out.push(st);
    const fh = computeFidraulisGyResourcesInsight(deck);
    if (fh) out.push(fh);
    return out;
}
