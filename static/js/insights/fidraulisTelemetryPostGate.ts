/**
 * Garde POST télémétrie Fidraulis : même périmètre que l’insight `fidraulis_gy_synchro` (module sans import de `deck.ts` pour tests Vitest).
 */
import type { DeckBuilderGridState, DeckRow } from '../deck.js';
import { computeFidraulisGyResourcesInsight } from './fidraulisGy.js';
import type { InsightDeckRow, InsightDeckSnapshot } from './types.js';

function deckRowToInsightRow(r: DeckRow): InsightDeckRow {
    return {
        name: r.name,
        type: r.type,
        quantity: r.quantity,
        attribute: r.attribute,
        level: r.level,
        race: r.race,
        frame_type: r.frame_type,
        imageUrl: r.imageUrl,
        cardId: r.cardId,
        cardDesc: r.cardDesc,
    };
}

/** Snapshot aligné sur `collectDeckInsights` / panneau Suggestions. */
export function builderGridToInsightSnapshot(grid: DeckBuilderGridState): InsightDeckSnapshot {
    return {
        main: grid.main.map(deckRowToInsightRow),
        extra: grid.extra.map(deckRowToInsightRow),
        side: grid.side?.map(deckRowToInsightRow),
    };
}

/** True si le serveur accepterait la télémétrie (au moins une ligne insight Fidraulis Extra). */
export function builderGridQualifiesForFidraulisTelemetryPost(grid: DeckBuilderGridState): boolean {
    return computeFidraulisGyResourcesInsight(builderGridToInsightSnapshot(grid)) != null;
}
