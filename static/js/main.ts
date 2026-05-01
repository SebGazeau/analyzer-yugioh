// Point d'entrée du front-end (module ES6)
// Interfaces : Decks | Builder | Analysis | Suggestions (onglet Suggestions dynamique).
// Arborescence : modules domaine sous `deck-builder/`, `associations/`, `services/`, `init/` ;
// la racine `js/` reste volontairement plate pour l’instant — regrouper si elle grossit encore.
import { addToDeck, cleanCardTable, exportDeckToFile, importDeckFromFile } from './deck.js';
import { updateDeckCount, computeGlobalStats } from './stats.js';
import { DATA_PSEUDO_ATTR, HEADER_AVATAR_SELECTOR } from './appPageDomSelectors.js';
import { getInitials } from './utils/user/index.js';
import { bindAppTabs } from './tabs.js';
import { bindBuilderDeckDraftLifecycle } from './init/builderDeckDraft.js';
import { initDecks } from './init/decks.js';
import { initBuilder } from './init/builder.js';
import { initAnalysis } from './init/analysis.js';
import {
    bindSuggestionsAddToDeck,
    bindSuggestionsFindCard,
    bindSuggestionsFidraulisVote,
} from './init/suggestions.js';
import { DOM_EVENT_DOM_CONTENT_LOADED } from './utils/domEventNames.js';
import { consumeSessionResyncAfterUnauthorized } from './utils/sessionResyncAfterUnauthorized.js';
import { showToast } from './utils/toast.js';
import { MSG_SESSION_RESYNC_AFTER_UNAUTHORIZED } from './utils/userDialogMessages.js';
import { bindAccountDeleteConfirm } from './account/deleteConfirm.js';
import { bindAccountTwofa } from './account/twofa.js';

function bindAvatarInitials(): void {
    document.querySelectorAll<HTMLElement>(HEADER_AVATAR_SELECTOR).forEach((el) => {
        el.textContent = getInitials(el.getAttribute(DATA_PSEUDO_ATTR));
    });
}

document.addEventListener(DOM_EVENT_DOM_CONTENT_LOADED, () => {
    if (consumeSessionResyncAfterUnauthorized()) {
        showToast(MSG_SESSION_RESYNC_AFTER_UNAUTHORIZED, { variant: 'info', durationMs: 6000 });
    }
    bindAvatarInitials();
    bindAppTabs();
    bindBuilderDeckDraftLifecycle();
    initDecks();
    initBuilder();
    initAnalysis();
    bindSuggestionsFindCard();
    bindSuggestionsAddToDeck();
    bindSuggestionsFidraulisVote();
    bindAccountDeleteConfirm();
    bindAccountTwofa();
});

export { setActiveTab } from './tabs.js';

// Pour tests unitaires
export { addToDeck, cleanCardTable, exportDeckToFile, importDeckFromFile, updateDeckCount, computeGlobalStats };
