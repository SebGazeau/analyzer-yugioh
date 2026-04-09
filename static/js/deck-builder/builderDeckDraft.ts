/**
 * Brouillon du builder en sessionStorage : survit aux navigations login / register (même onglet).
 */
import type { DeckJsonFilePayload } from './deckFileIo.js';
import { DECK_SECTIONS, type DeckSection } from '../deckSectionOrder.js';

export const BUILDER_DECK_DRAFT_SESSION_KEY = 'analyzer_ygo_builder_deck_draft_v1';

export type BuilderDeckDraftV1 = {
    v: 1;
    savedAt: string;
    name: string;
} & DeckJsonFilePayload;

export function deckSectionsHaveRows<T>(state: Record<DeckSection, T[]>): boolean {
    return DECK_SECTIONS.some((s) => state[s].length > 0);
}

export function writeBuilderDeckDraftToSession(name: string, sections: DeckJsonFilePayload): void {
    try {
        const payload: BuilderDeckDraftV1 = {
            v: 1,
            savedAt: new Date().toISOString(),
            name: name.trim(),
            ...sections,
        };
        sessionStorage.setItem(BUILDER_DECK_DRAFT_SESSION_KEY, JSON.stringify(payload));
    } catch {
        /* quota, mode privé, etc. */
    }
}

export function readBuilderDeckDraftFromSession(): BuilderDeckDraftV1 | null {
    try {
        const raw = sessionStorage.getItem(BUILDER_DECK_DRAFT_SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as unknown;
        if (!data || typeof data !== 'object') return null;
        const o = data as Partial<BuilderDeckDraftV1>;
        if (o.v !== 1) return null;
        if (typeof o.savedAt !== 'string') return null;
        if (typeof o.name !== 'string') return null;
        for (const s of DECK_SECTIONS) {
            if (!Array.isArray(o[s])) return null;
        }
        return o as BuilderDeckDraftV1;
    } catch {
        return null;
    }
}

export function clearBuilderDeckDraftFromSession(): void {
    try {
        sessionStorage.removeItem(BUILDER_DECK_DRAFT_SESSION_KEY);
    } catch {
        /* ignore */
    }
}

/** Corps attendu par `applyParsedDeckJson`. */
export function draftPayloadForImport(draft: BuilderDeckDraftV1): DeckJsonFilePayload {
    return {
        main: draft.main,
        extra: draft.extra,
        side: draft.side,
    };
}
