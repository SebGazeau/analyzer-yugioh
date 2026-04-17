import { describe, expect, it } from 'vitest';
import type { DeckBuilderGridState, DeckRow } from '../../deck.js';
import { builderGridQualifiesForFidraulisTelemetryPost } from '../../insights/fidraulisTelemetryPostGate.js';

function deckRow(p: Partial<DeckRow> & Pick<DeckRow, 'name' | 'type'>): DeckRow {
    return { quantity: 1, engine: '', categories: [], ...p };
}

function grid(p: Partial<DeckBuilderGridState>): DeckBuilderGridState {
    return {
        main: p.main ?? [],
        extra: p.extra ?? [],
        side: p.side ?? [],
    };
}

describe('builderGridQualifiesForFidraulisTelemetryPost', () => {
    it('retourne false avec Fidraulis mais Extra sans synchro ressource GY', () => {
        const g = grid({
            main: [deckRow({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [deckRow({ name: 'Red-Eyes Dark Dragoon', type: 'Fusion Monster' })],
        });
        expect(builderGridQualifiesForFidraulisTelemetryPost(g)).toBe(false);
    });

    it('retourne true avec Fidraulis et synchro allowlist Extra', () => {
        const g = grid({
            main: [deckRow({ name: 'Fidraulis Harmonia', type: 'Tuner Monster' })],
            extra: [
                deckRow({
                    name: 'Golden Cloud Beast - Malong',
                    type: 'Monster',
                    cardId: 93125329,
                }),
            ],
        });
        expect(builderGridQualifiesForFidraulisTelemetryPost(g)).toBe(true);
    });
});
