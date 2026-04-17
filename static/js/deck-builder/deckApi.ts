/**
 * Appels HTTP et sérialisation JSON pour les decks (`DECK_API_COLLECTION_URL`).
 * L’état du builder et le DOM restent dans deck.ts.
 */
import {
    FETCH_HEADERS_JSON,
    HTTP_METHOD_DELETE,
    HTTP_METHOD_POST,
    HTTP_METHOD_PUT,
    HTTP_STATUS_UNAUTHORIZED,
} from '../utils/httpMime.js';
import { mapDeckSections } from '../deckSection.js';
import type { DeckSection } from '../deckSectionOrder.js';
import {
    DECK_DUPLICATE_NAME_SUFFIX,
    DECK_NAME_FALLBACK_DISPLAY,
    MSG_DECK_API_AUTH_REQUIRED,
    MSG_DECK_API_DECK_NOT_FOUND,
} from '../utils/userDialogMessages.js';
import { DECK_API_VALIDATION_ERRORS_JOIN } from './deckApiCopy.js';
import { DECK_API_COLLECTION_URL, deckApiDeckByIdUrl } from './deckApiRoutes.js';
import { DECK_FETCH_INIT } from './deckConstants.js';
import { markSessionResyncAfterUnauthorized } from '../utils/sessionResyncAfterUnauthorized.js';

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

/**
 * Session expirée alors que le HTML affiche encore le chrome « connecté » (SSR) :
 * recharge la page pour resynchroniser l’en-tête avec le cookie réel.
 */
function reloadPageIfUnauthorizedAndDomShowsLoggedInSession(res: Response, source: string): void {
    if (res.status !== HTTP_STATUS_UNAUTHORIZED) return;
    if (typeof document === 'undefined') return;
    if (!document.querySelector('[data-auth-action="logout"]')) return;
    markSessionResyncAfterUnauthorized();
    window.location.reload();
}

function deckApiErrorMessage(res: Response, data: Record<string, unknown>): string {
    if (res.status === HTTP_STATUS_UNAUTHORIZED) {
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
    if (!res.ok) {
        reloadPageIfUnauthorizedAndDomShowsLoggedInSession(res, 'apiListMyDecks');
        return [];
    }
    return res.json();
}

export async function apiCreateDeck(
    name: string,
    sections: DeckSectionsPayload,
): Promise<{ id?: number; error?: string; unauthorized?: boolean }> {
    const body = { name: name.trim(), ...sections };
    const res = await fetch(DECK_API_COLLECTION_URL, {
        ...DECK_FETCH_INIT,
        method: HTTP_METHOD_POST,
        headers: { ...FETCH_HEADERS_JSON },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        const unauthorized = res.status === HTTP_STATUS_UNAUTHORIZED;
        reloadPageIfUnauthorizedAndDomShowsLoggedInSession(res, 'apiCreateDeck');
        return {
            error: deckApiErrorMessage(res, data),
            unauthorized,
        };
    }
    const id = data.id as number;
    return id != null ? { id } : {};
}

export async function apiUpdateDeck(
    deckId: number,
    name: string,
    sections: DeckSectionsPayload,
    cover: { name: string; imageUrl: string } | null,
): Promise<{ ok?: boolean; error?: string; unauthorized?: boolean }> {
    const body: Record<string, unknown> = { name, ...sections };
    if (cover) {
        body.cover_card_name = cover.name;
        body.cover_image_url = cover.imageUrl || undefined;
    }
    const res = await fetch(deckApiDeckByIdUrl(deckId), {
        ...DECK_FETCH_INIT,
        method: HTTP_METHOD_PUT,
        headers: { ...FETCH_HEADERS_JSON },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        const unauthorized = res.status === HTTP_STATUS_UNAUTHORIZED;
        reloadPageIfUnauthorizedAndDomShowsLoggedInSession(res, 'apiUpdateDeck');
        return { error: deckApiErrorMessage(res, data), unauthorized };
    }
    return { ok: true };
}

export async function apiDuplicateDeck(id: number): Promise<{ id?: number; error?: string; unauthorized?: boolean }> {
    const res = await fetch(deckApiDeckByIdUrl(id), DECK_FETCH_INIT);
    if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (res.status === HTTP_STATUS_UNAUTHORIZED) {
            reloadPageIfUnauthorizedAndDomShowsLoggedInSession(res, 'apiDuplicateDeck:get');
            return { error: deckApiErrorMessage(res, data), unauthorized: true };
        }
        return { error: typeof data.error === 'string' ? data.error : MSG_DECK_API_DECK_NOT_FOUND };
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const baseName = String(data.name ?? DECK_NAME_FALLBACK_DISPLAY).trim() || DECK_NAME_FALLBACK_DISPLAY;
    const newName = `${baseName}${DECK_DUPLICATE_NAME_SUFFIX}`;
    const sections = mapDeckSections((s) => (Array.isArray(data[s]) ? data[s] : [])) as DeckSectionsPayload;
    const body = { name: newName, ...sections };
    const postRes = await fetch(DECK_API_COLLECTION_URL, {
        ...DECK_FETCH_INIT,
        method: HTTP_METHOD_POST,
        headers: { ...FETCH_HEADERS_JSON },
        body: JSON.stringify(body),
    });
    const postData = (await postRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!postRes.ok) {
        const unauthorized = postRes.status === HTTP_STATUS_UNAUTHORIZED;
        reloadPageIfUnauthorizedAndDomShowsLoggedInSession(postRes, 'apiDuplicateDeck:post');
        return { error: deckApiErrorMessage(postRes, postData), ...(unauthorized ? { unauthorized: true } : {}) };
    }
    const newId = postData.id as number;
    return newId != null ? { id: newId } : {};
}

export type FetchDeckByIdOutcome =
    | { status: 'ok'; data: Record<string, unknown> }
    | { status: 'unauthorized' }
    | { status: 'other_error' };

/** GET deck par id avec distinction 401 (session) vs autre erreur. */
export async function apiFetchDeckByIdDetailed(id: number): Promise<FetchDeckByIdOutcome> {
    const res = await fetch(deckApiDeckByIdUrl(id), DECK_FETCH_INIT);
    if (!res.ok) {
        reloadPageIfUnauthorizedAndDomShowsLoggedInSession(res, 'apiFetchDeckById');
        if (res.status === HTTP_STATUS_UNAUTHORIZED) return { status: 'unauthorized' };
        return { status: 'other_error' };
    }
    const data = await res.json().catch(() => null);
    if (data && typeof data === 'object') {
        return { status: 'ok', data: data as Record<string, unknown> };
    }
    return { status: 'other_error' };
}

/** GET deck par id — corps JSON ou null si échec HTTP. */
export async function apiFetchDeckById(id: number): Promise<Record<string, unknown> | null> {
    const o = await apiFetchDeckByIdDetailed(id);
    return o.status === 'ok' ? o.data : null;
}

export async function apiDeleteDeck(id: number): Promise<{ ok: boolean; unauthorized?: boolean }> {
    const res = await fetch(deckApiDeckByIdUrl(id), { ...DECK_FETCH_INIT, method: HTTP_METHOD_DELETE });
    if (!res.ok) {
        reloadPageIfUnauthorizedAndDomShowsLoggedInSession(res, 'apiDeleteDeck');
        return { ok: false, unauthorized: res.status === HTTP_STATUS_UNAUTHORIZED };
    }
    return { ok: true };
}
