// Point d'entrée du front-end (module ES6)
// Interfaces : Decks | Builder | Analysis | Suggestions (onglet Suggestions dynamique).
import { addToDeck, cleanCardTable, exportDeckToFile, importDeckFromFile } from './deck.js';
import { updateDeckCount, computeGlobalStats } from './stats.js';
import { DATA_PSEUDO_ATTR, HEADER_AVATAR_SELECTOR } from './appPageDomSelectors.js';
import { bindAppTabs } from './tabs.js';
import { initDecks } from './init/decks.js';
import { initBuilder } from './init/builder.js';
import { initAnalysis } from './init/analysis.js';
import { bindSuggestionsAddToDeck, bindSuggestionsFindCard } from './init/suggestions.js';

function getInitials(pseudo: string | null): string {
    if (!pseudo || !pseudo.trim()) return '?';
    const parts = pseudo.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return pseudo.slice(0, 2).toUpperCase().padEnd(2, pseudo[0]);
}

function bindAvatarInitials(): void {
    document.querySelectorAll<HTMLElement>(HEADER_AVATAR_SELECTOR).forEach((el) => {
        el.textContent = getInitials(el.getAttribute(DATA_PSEUDO_ATTR));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindAvatarInitials();
    bindAppTabs();
    initDecks();
    initBuilder();
    initAnalysis();
    bindSuggestionsFindCard();
    bindSuggestionsAddToDeck();
});

export { setActiveTab } from './tabs.js';

// Pour tests unitaires
export { addToDeck, cleanCardTable, exportDeckToFile, importDeckFromFile, updateDeckCount, computeGlobalStats };
