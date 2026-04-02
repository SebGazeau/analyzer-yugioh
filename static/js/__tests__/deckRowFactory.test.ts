import { describe, expect, it } from 'vitest';
import type { Card } from '../api.js';
import { createDeckRowFromApiCard, createDeckRowFromServerEntry } from '../deck-builder/deckRowFactory.js';

describe('deckRowFactory', () => {
    it('createDeckRowFromApiCard : nom EN, ids et maxCopies', () => {
        const card = {
            name: 'JP',
            name_en: 'EN Name',
            id: 123,
            type: 'Spell Card',
            ban_tcg: 'Limited',
            image_url: 'https://x',
        } as Card;
        const row = createDeckRowFromApiCard(card);
        expect(row.name).toBe('EN Name');
        expect(row.quantity).toBe(1);
        expect(row.cardId).toBe(123);
        expect(row.deckCopyId).toBe(123);
        expect(row.maxCopies).toBe(1);
        expect(row.engine).toBe('');
        expect(row.categories).toEqual([]);
    });

    it('createDeckRowFromServerEntry : qty, engine, deck_copy_id serveur', () => {
        const info = {
            name: 'X',
            name_en: 'Resolved',
            id: 99,
            type: 'Monster',
            ban_tcg: 'Unlimited',
        } as Card;
        const row = createDeckRowFromServerEntry(info, {
            name: 'ignored',
            quantity: 2,
            engine: 'E1',
            categories: ['a'],
            deck_copy_id: 555,
        });
        expect(row.name).toBe('Resolved');
        expect(row.quantity).toBe(2);
        expect(row.engine).toBe('E1');
        expect(row.deckCopyId).toBe(555);
        expect(row.cardId).toBe(99);
    });
});
