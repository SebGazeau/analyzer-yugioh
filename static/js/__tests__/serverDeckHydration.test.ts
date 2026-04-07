import { describe, expect, it } from 'vitest';
import {
    parseUnknownAsServerDeckListEntries,
    resolveServerDeckListEntriesToRows,
} from '../deck-builder/serverDeckHydration.js';

describe('serverDeckHydration', () => {
    it('parseUnknownAsServerDeckListEntries', () => {
        expect(parseUnknownAsServerDeckListEntries(null)).toEqual([]);
        expect(parseUnknownAsServerDeckListEntries([{ name: 'A' }])).toEqual([{ name: 'A' }]);
    });

    it('resolveServerDeckListEntriesToRows ignore les noms non résolus', async () => {
        const rows = await resolveServerDeckListEntriesToRows(
            [{ name: 'missing' }, { name: 'ok', quantity: 2 }],
            async (name) => (name === 'ok' ? { name: 'OK', id: 1, type: 'Spell' } : null),
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe('OK');
        expect(rows[0].quantity).toBe(2);
    });
});
