/**
 * Onglet Suggestions : boutons « Chercher » → Builder + recherche carte.
 */
import { runSearchWithQuery } from '../search.js';
import { setActiveTab } from '../tabs.js';

export function bindSuggestionsFindCard(): void {
    document.addEventListener('click', (e: Event) => {
        const el = (e.target as HTMLElement).closest('[data-insights-find-card]');
        if (!el || !(el instanceof HTMLButtonElement)) return;
        const panel = document.getElementById('suggestions');
        if (!panel?.contains(el)) return;
        const name = el.getAttribute('data-insights-find-card');
        if (!name) return;
        e.preventDefault();
        setActiveTab('builder');
        requestAnimationFrame(() => runSearchWithQuery(name));
    });
}
