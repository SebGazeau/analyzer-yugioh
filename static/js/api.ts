// Fonctions d'accès à l'API
import { cardApiByNameUrl } from './cardSearchApiRoutes.js';
import { SEARCH_MIN_QUERY_LENGTH } from './searchConstants.js';
import { fetchSearchResultsForQuery } from './services/search/searchApi.js';
import type { SearchApiCard } from './services/search/searchApiTypes.js';

/** Carte telle que renvoyée par l’API (champs optionnels selon l’endpoint). */
export type Card = SearchApiCard;

/** Récupère une carte par nom exact (pour l'import). Essaie carte par nom puis recherche, avec variantes. */
export async function fetchCardByName(name: string): Promise<Card | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const tryExact = async (n: string): Promise<Card | null> => {
        const r = await fetch(cardApiByNameUrl(n));
        if (!r.ok) return null;
        const card = (await r.json()) as SearchApiCard;
        return card && typeof card === 'object' && typeof card.name === 'string' && card.name ? card : null;
    };

    let card = await tryExact(trimmed);
    if (card) return card;

    const variants = [
        trimmed,
        trimmed.replace(/\s*&\s*/g, ' and '),
        trimmed.replace(/\s+and\s+/gi, ' & '),
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const v of variants) {
        if (v === trimmed) continue;
        card = await tryExact(v);
        if (card) return card;
    }

    if (trimmed.length >= SEARCH_MIN_QUERY_LENGTH) {
        const cards = await fetchSearchResultsForQuery(trimmed);
        return cards.find((c) => c.name === trimmed || c.name_en === trimmed) || null;
    }
    return null;
} 