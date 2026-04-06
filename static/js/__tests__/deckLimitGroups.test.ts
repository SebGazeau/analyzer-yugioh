import { describe, expect, it } from 'vitest';
import { DECK_DEFAULT_MAX_COPIES_PER_CARD } from '../deck-builder/deckConstants.js';
import {
    banTcgToMaxCopies,
    DECK_BAN_TCG_MAX_FORBIDDEN,
    DECK_BAN_TCG_MAX_LIMITED,
    DECK_BAN_TCG_MAX_SEMI_LIMITED,
} from '../deck-builder/deckLimitGroups.js';

describe('deckLimitGroups', () => {
    it('expose les plafonds banlist TCG', () => {
        expect(DECK_BAN_TCG_MAX_FORBIDDEN).toBe(0);
        expect(DECK_BAN_TCG_MAX_LIMITED).toBe(1);
        expect(DECK_BAN_TCG_MAX_SEMI_LIMITED).toBe(2);
    });

    it('banTcgToMaxCopies mappe les statuts vers les constantes', () => {
        expect(banTcgToMaxCopies('Forbidden')).toBe(DECK_BAN_TCG_MAX_FORBIDDEN);
        expect(banTcgToMaxCopies('banned')).toBe(DECK_BAN_TCG_MAX_FORBIDDEN);
        expect(banTcgToMaxCopies('Limited')).toBe(DECK_BAN_TCG_MAX_LIMITED);
        expect(banTcgToMaxCopies('Semi-Limited')).toBe(DECK_BAN_TCG_MAX_SEMI_LIMITED);
        expect(banTcgToMaxCopies(undefined)).toBe(DECK_DEFAULT_MAX_COPIES_PER_CARD);
        expect(banTcgToMaxCopies('')).toBe(DECK_DEFAULT_MAX_COPIES_PER_CARD);
    });
});
