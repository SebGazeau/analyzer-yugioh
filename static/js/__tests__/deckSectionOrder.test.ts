import { describe, expect, it } from 'vitest';
import { DECK_SECTIONS } from '../deckSectionOrder.js';

describe('deckSectionOrder', () => {
    it('ordre canonique main → extra → side', () => {
        expect([...DECK_SECTIONS]).toEqual(['main', 'extra', 'side']);
    });
});
