/**
 * Marquage HTML des correspondances de recherche (template uniquement).
 */
import { SEARCH_HIGHLIGHT_CLASS } from './searchDomSelectors.js';

export function highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, `<mark class="${SEARCH_HIGHLIGHT_CLASS}">$1</mark>`);
}
