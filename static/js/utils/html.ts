/**
 * Helpers HTML / format pour le rendu côté client.
 */

import { DECK_SAVED_LIST_DATE_FORMAT_OPTIONS, DECK_SAVED_LIST_DATE_LOCALE } from './deckListDateFormat.js';

export function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

/** Attributs HTML : guillemets, &, chevrons, apostrophe. */
export function escapeAttr(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function formatDeckDate(iso: string): string {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleDateString(DECK_SAVED_LIST_DATE_LOCALE, DECK_SAVED_LIST_DATE_FORMAT_OPTIONS);
    } catch {
        return iso;
    }
}
