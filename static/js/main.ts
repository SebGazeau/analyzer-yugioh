// Point d'entrée du front-end (module ES6)
// Interfaces : Decks | Builder | Analysis | Suggestions (onglet Suggestions dynamique).
import { addToDeck, cleanCardTable, exportDeckToFile, importDeckFromFile } from './deck.js';
import { updateDeckCount, computeGlobalStats } from './stats.js';
import {
    HEADER_AVATAR_INITIALS_PLACEHOLDER,
    HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT,
} from './appHeaderAvatarCopy.js';
import { DATA_PSEUDO_ATTR, HEADER_AVATAR_SELECTOR } from './appPageDomSelectors.js';
import { bindAppTabs } from './tabs.js';
import { initDecks } from './init/decks.js';
import { initBuilder } from './init/builder.js';
import { initAnalysis } from './init/analysis.js';
import { bindSuggestionsAddToDeck, bindSuggestionsFindCard } from './init/suggestions.js';
import { DOM_EVENT_DOM_CONTENT_LOADED } from './utils/domEventNames.js';

function getInitials(pseudo: string | null): string {
    if (!pseudo || !pseudo.trim()) return HEADER_AVATAR_INITIALS_PLACEHOLDER;
    const parts = pseudo.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return pseudo
        .slice(0, HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT)
        .toUpperCase()
        .padEnd(HEADER_AVATAR_SINGLE_WORD_CHAR_COUNT, pseudo[0]);
}

function bindAvatarInitials(): void {
    document.querySelectorAll<HTMLElement>(HEADER_AVATAR_SELECTOR).forEach((el) => {
        el.textContent = getInitials(el.getAttribute(DATA_PSEUDO_ATTR));
    });
}

document.addEventListener(DOM_EVENT_DOM_CONTENT_LOADED, () => {
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
