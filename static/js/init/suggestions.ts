/**
 * Onglet Suggestions : « Chercher » → Builder + recherche ; clic ligne / vignette → ajout deck.
 */
import { addToDeck, type DeckSection } from '../deck.js';
import { fetchSearchResultsForQuery, pickBestCardFromSearchResults, runSearchWithQuery } from '../search.js';
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

async function addSuggestedCardToDeck(name: string, section?: DeckSection): Promise<void> {
    const card = pickBestCardFromSearchResults(await fetchSearchResultsForQuery(name), name);
    if (!card) {
        alert('Carte introuvable ou nom trop court pour la recherche (minimum 4 caractères).');
        return;
    }
    const ok = await addToDeck(card, section);
    if (!ok) {
        alert("Impossible d'ajouter (limite d'exemplaires, zone pleine ou type incompatible).");
    }
}

/** Clic sur une proposition Number Xyz (ligne) ou sur une vignette Main/Side. */
export function bindSuggestionsAddToDeck(): void {
    document.addEventListener('click', (e: Event) => {
        const panel = document.getElementById('suggestions');
        const t = e.target as HTMLElement;
        if (!panel?.contains(t)) return;
        if (t.closest('button')) return;

        const chip = t.closest('[data-insights-add-deck-card]');
        if (chip) {
            const name = chip.getAttribute('data-insights-card-name');
            const section = chip.getAttribute('data-insights-section');
            if (!name || (section !== 'main' && section !== 'side')) return;
            e.preventDefault();
            void addSuggestedCardToDeck(name, section);
            return;
        }

        const row = t.closest('[data-insights-suggest-row]');
        if (row) {
            const name = row.getAttribute('data-insights-suggest-name');
            if (!name) return;
            e.preventDefault();
            void addSuggestedCardToDeck(name);
        }
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const panel = document.getElementById('suggestions');
        const t = e.target as HTMLElement;
        if (!panel?.contains(t)) return;
        const chip = t.closest('[data-insights-add-deck-card]');
        if (!chip) return;
        e.preventDefault();
        const name = chip.getAttribute('data-insights-card-name');
        const section = chip.getAttribute('data-insights-section');
        if (!name || (section !== 'main' && section !== 'side')) return;
        void addSuggestedCardToDeck(name, section);
    });
}
