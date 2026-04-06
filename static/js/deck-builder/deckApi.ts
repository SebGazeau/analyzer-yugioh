/**
 * Appels HTTP et sérialisation JSON pour les decks (`DECK_API_COLLECTION_URL`).
 * L’état du builder et le DOM restent dans deck.ts.
 */
import { FETCH_HEADERS_JSON } from '../utils/httpMime.js';
import { DECK_SECTIONS, mapDeckSections, type DeckSection } from '../deckSection.js';
import {
    DECK_DUPLICATE_NAME_SUFFIX,
    DECK_NAME_FALLBACK_DISPLAY,
    MSG_DECK_API_AUTH_REQUIRED,
    MSG_DECK_API_DECK_NOT_FOUND,
} from '../utils/userDialogMessages.js';
import { DECK_API_VALIDATION_ERRORS_JOIN } from './deckApiCopy.js';
import { DECK_API_COLLECTION_URL, deckApiDeckByIdUrl } from './deckApiRoutes.js';
import { DECK_FETCH_INIT } from './deckConstants.js';

export type DeckEntryPayload = {
    name: string;
    quantity: number;
    id?: number;
    engine?: string;
    categories?: string[];
};

/** Sous-ensemble d’une ligne deck nécessaire pour construire le payload API. */
export interface DeckRowPayloadSource {
    name: string;
    quantity: number;
    engine: string;
    categories: string[];
    cardId?: number;
}

export function toDeckEntryPayload(e: {
    name: string;
    quantity: number;
    engine: string;
    categories: string[];
    cardId?: number;
}): DeckEntryPayload {
    const out: DeckEntryPayload = { name: e.name, quantity: e.quantity };
    if (e.cardId != null && e.cardId > 0) out.id = e.cardId;
    if (e.engine && e.engine.trim() !== '') out.engine = e.engine.trim();
    if (e.categories && e.categories.length > 0) out.categories = e.categories;
    return out;
}

export function deckRowToEntryPayload(r: DeckRowPayloadSource): DeckEntryPayload {
    return toDeckEntryPayload({
        name: r.name,
        quantity: r.quantity,
        engine: r.engine,
        categories: r.categories,
        cardId: r.cardId,
    });
}

export type DeckSectionsPayload = { [S in DeckSection]: DeckEntryPayload[] };

export function buildDeckSectionsPayload(sections: Record<DeckSection, DeckRowPayloadSource[]>): DeckSectionsPayload {
    return mapDeckSections((s) => sections[s].map(deckRowToEntryPayload)) as DeckSectionsPayload;
}

function deckApiErrorMessage(res: Response, data: Record<string, unknown>): string {
    if (res.status === 401) {
        return typeof data.error === 'string' ? data.error : MSG_DECK_API_AUTH_REQUIRED;
    }
    return (
        (typeof data.error === 'string' ? data.error : null) ||
        (Array.isArray(data.errors) && data.errors.length
            ? (data.errors as string[]).join(DECK_API_VALIDATION_ERRORS_JOIN)
            : null) ||
        res.statusText
    );
}

export type DeckListItem = {
    id: number;
    name: string;
    is_public: boolean;
    created_at: string;
    cover_card_name?: string;
    cover_image_url?: string;
};

export async function apiListMyDecks(): Promise<DeckListItem[]> {
    const res = await fetch(DECK_API_COLLECTION_URL, DECK_FETCH_INIT);
    if (!res.ok) return [];
    return res.json();
}

export async function apiCreateDeck(name: string, sections: DeckSectionsPayload): Promise<{ id?: number; error?: string }> {
    const body = { name: name.trim(), ...sections };
    const res = await fetch(DECK_API_COLLECTION_URL, {
        ...DECK_FETCH_INIT,
        method: 'POST',
        headers: { ...FETCH_HEADERS_JSON },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        return { error: deckApiErrorMessage(res, data) };
    }
    const id = data.id as number;
    return id != null ? { id } : {};
}

export async function apiUpdateDeck(
    deckId: number,
    name: string,
    sections: DeckSectionsPayload,
    cover: { name: string; imageUrl: string } | null,
): Promise<{ ok?: boolean; error?: string }> {
    const body: Record<string, unknown> = { name, ...sections };
    if (cover) {
        body.cover_card_name = cover.name;
        body.cover_image_url = cover.imageUrl || undefined;
    }
    const res = await fetch(deckApiDeckByIdUrl(deckId), {
        ...DECK_FETCH_INIT,
        method: 'PUT',
        headers: { ...FETCH_HEADERS_JSON },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        return { error: deckApiErrorMessage(res, data) };
    }
    return { ok: true };
}

export async function apiDuplicateDeck(id: number): Promise<{ id?: number; error?: string }> {
    const res = await fetch(deckApiDeckByIdUrl(id), DECK_FETCH_INIT);
    if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (res.status === 401) return { error: deckApiErrorMessage(res, data) };
        return { error: typeof data.error === 'string' ? data.error : MSG_DECK_API_DECK_NOT_FOUND };
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const baseName = String(data.name ?? DECK_NAME_FALLBACK_DISPLAY).trim() || DECK_NAME_FALLBACK_DISPLAY;
    const newName = `${baseName}${DECK_DUPLICATE_NAME_SUFFIX}`;
    const sections = mapDeckSections((s) => (Array.isArray(data[s]) ? data[s] : [])) as DeckSectionsPayload;
    const body = { name: newName, ...sections };
    const postRes = await fetch(DECK_API_COLLECTION_URL, {
        ...DECK_FETCH_INIT,
        method: 'POST',
        headers: { ...FETCH_HEADERS_JSON },
        body: JSON.stringify(body),
    });
    const postData = (await postRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!postRes.ok) {
        return { error: deckApiErrorMessage(postRes, postData) };
    }
    const newId = postData.id as number;
    return newId != null ? { id: newId } : {};
}

/** GET deck par id — corps JSON ou null si échec HTTP. */
export async function apiFetchDeckById(id: number): Promise<Record<string, unknown> | null> {
    const res = await fetch(deckApiDeckByIdUrl(id), DECK_FETCH_INIT);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

export async function apiDeleteDeck(id: number): Promise<boolean> {
    const res = await fetch(deckApiDeckByIdUrl(id), { ...DECK_FETCH_INIT, method: 'DELETE' });
    return res.ok;
}
