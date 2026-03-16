/**
 * api.ts — Typed fetch wrappers for all Actix backend calls.
 *
 * Phase 2 addition — new file, does NOT change existing code.
 * Replace raw fetch() calls in deck.ts / search.ts incrementally.
 *
 * All server response shapes must match the Serde structs in src/models/.
 * Keep this file in sync with the backend when routes change.
 */

// ── Data shapes (must match Serde structs) ────────────────────────────────────

export type CardZone = 'main' | 'extra' | 'side';

export interface DeckCard {
  id: number;
  name: string;
  type: string;
  race: string;
  atk?: number;
  def?: number;
  level?: number;
  copies: number;
  zone: CardZone;
  categories: string[];
}

export interface DeckState {
  id: string | null;
  name: string;
  main: DeckCard[];
  extra: DeckCard[];
  side: DeckCard[];
  updatedAt?: string;
}

export interface SearchResult {
  id: number;
  name: string;
  type: string;
  race: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  card_images: Array<{ image_url: string; image_url_small: string }>;
}

export interface DeckSummary {
  id: string;
  name: string;
  mainCount: number;
  extraCount: number;
  sideCount: number;
  updatedAt: string;
}

export interface SaveDeckResponse {
  id: string;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Base request ──────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    throw new ApiError(0, `Network error on ${path}: ${String(err)}`);
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response body is not JSON — use default message
    }
    throw new ApiError(response.status, message);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  /**
   * Search cards by name / type. Hits GET /api/cards/search?q=...
   */
  searchCards(query: string): Promise<SearchResult[]> {
    const q = encodeURIComponent(query.trim());
    return request<SearchResult[]>(`/api/cards/search?q=${q}`);
  },

  /**
   * Load all decks for the current user. Hits GET /api/decks
   */
  listDecks(): Promise<DeckSummary[]> {
    return request<DeckSummary[]>('/api/decks');
  },

  /**
   * Load a single deck by ID. Hits GET /api/decks/:id
   */
  loadDeck(id: string): Promise<DeckState> {
    return request<DeckState>(`/api/decks/${encodeURIComponent(id)}`);
  },

  /**
   * Create a new deck. Hits POST /api/decks
   */
  createDeck(deck: Omit<DeckState, 'id'>): Promise<SaveDeckResponse> {
    return request<SaveDeckResponse>('/api/decks', {
      method: 'POST',
      body: JSON.stringify(deck),
    });
  },

  /**
   * Update an existing deck. Hits PUT /api/decks/:id
   */
  updateDeck(id: string, deck: DeckState): Promise<SaveDeckResponse> {
    return request<SaveDeckResponse>(`/api/decks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(deck),
    });
  },

  /**
   * Delete a deck. Hits DELETE /api/decks/:id
   */
  deleteDeck(id: string): Promise<void> {
    return request<void>(`/api/decks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Save deck — creates if no ID, updates if ID exists.
   */
  saveDeck(deck: DeckState): Promise<SaveDeckResponse> {
    if (deck.id) {
      return api.updateDeck(deck.id, deck);
    }
    return api.createDeck(deck);
  },
};
