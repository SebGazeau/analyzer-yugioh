// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    BUILDER_DECK_DRAFT_SESSION_KEY,
    clearBuilderDeckDraftFromSession,
    deckSectionsHaveRows,
    draftPayloadForImport,
    readBuilderDeckDraftFromSession,
    writeBuilderDeckDraftToSession,
} from '../deck-builder/builderDeckDraft.js';
import { emptyArraysByDeckSection } from '../deckSection.js';
import type { DeckRow } from '../deck.js';

describe('builderDeckDraft', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('deckSectionsHaveRows est faux pour grilles vides', () => {
        expect(deckSectionsHaveRows(emptyArraysByDeckSection<DeckRow>())).toBe(false);
    });

    it('deckSectionsHaveRows est vrai si au moins une ligne', () => {
        const st = emptyArraysByDeckSection<DeckRow>();
        st.main.push({} as DeckRow);
        expect(deckSectionsHaveRows(st)).toBe(true);
    });

    it('write puis read retourne le même payload (roundtrip)', () => {
        const sections = {
            main: [{ name: 'A', quantity: 1, id: 1 }],
            extra: [],
            side: [],
        };
        writeBuilderDeckDraftToSession('Mon deck', sections);
        const d = readBuilderDeckDraftFromSession();
        expect(d).not.toBeNull();
        expect(d!.v).toBe(1);
        expect(d!.name).toBe('Mon deck');
        expect(d!.main).toHaveLength(1);
        expect(d!.extra).toEqual([]);
        expect(d!.side).toEqual([]);
        const imp = draftPayloadForImport(d!);
        expect(imp.main).toEqual(sections.main);
    });

    it('read retourne null si version incorrecte', () => {
        sessionStorage.setItem(BUILDER_DECK_DRAFT_SESSION_KEY, JSON.stringify({ v: 99, name: 'x', main: [], extra: [], side: [] }));
        expect(readBuilderDeckDraftFromSession()).toBeNull();
    });

    it('clearBuilderDeckDraftFromSession supprime la clé', () => {
        writeBuilderDeckDraftToSession('x', { main: [], extra: [], side: [] });
        clearBuilderDeckDraftFromSession();
        expect(sessionStorage.getItem(BUILDER_DECK_DRAFT_SESSION_KEY)).toBeNull();
    });

    it('write ignore les erreurs sessionStorage (quota)', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        expect(() => writeBuilderDeckDraftToSession('x', { main: [], extra: [], side: [] })).not.toThrow();
        spy.mockRestore();
    });
});
