/**
 * Présentation / filtrage des cartes recherche (sans accès au DOM des résultats).
 */

import { SEARCH_FILTER_ALL, type SearchFilter } from '../../searchFilterConstants.js';
import { cardTypeKindFromTypeString } from '../../utils/cardTypeKind.js';
import { TEXT_BLACK_STAR, TEXT_MIDDLE_DOT } from '../../utils/textPlaceholders.js';
import type { SearchApiCard } from './searchApiTypes.js';

/** Query `locale` pour l’API recherche : aligné sur `<html lang>` (ex. fr → `card_locales.fr`). */
export function searchLocaleQuery(): string {
    const raw = document.documentElement.lang?.trim().toLowerCase() || '';
    if (!raw || raw.startsWith('en')) return '';
    const base = raw.split('-')[0];
    if (!base) return '';
    return `&locale=${encodeURIComponent(base)}`;
}

export function getSubtypeLine(card: SearchApiCard): string {
    const t = (String(card.type ?? '')).toLowerCase();
    const race = String(card.race ?? '');
    const level = card.level != null ? card.level : '';
    const arch =
        typeof card.archetype === 'string' && card.archetype.trim() ? card.archetype.trim() : '';
    if (t.includes('monster')) {
        const part = race || card.type || '';
        const line = level ? `${part} ${TEXT_MIDDLE_DOT} ${level}${TEXT_BLACK_STAR}` : part;
        return arch ? `${line} ${TEXT_MIDDLE_DOT} ${arch}` : line;
    }
    return String(card.type ?? '');
}

export function filterCards(cards: SearchApiCard[], filter: SearchFilter): SearchApiCard[] {
    if (filter === SEARCH_FILTER_ALL) return cards;
    return cards.filter((c) => cardTypeKindFromTypeString(c.type) === filter);
}
