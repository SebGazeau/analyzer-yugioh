/**
 * Onglet Suggestions : « Chercher » → Builder + recherche ; clic ligne / vignette → ajout deck.
 */
import { addToDeck } from '../deck.js';
import { isDeckSectionMainSide } from '../deckSectionMainSideShortCopy.js';
import type { DeckSection } from '../deckSectionOrder.js';
import { fetchSearchResultsForQuery, pickBestCardFromSearchResults, runSearchWithQuery } from '../search.js';
import {
    INSIGHTS_ADD_DECK_CARD_SELECTOR,
    INSIGHTS_CARD_NAME_DATA_ATTR,
    INSIGHTS_FIND_CARD_DATA_ATTR,
    INSIGHTS_FIND_CARD_SELECTOR,
    INSIGHTS_SECTION_DATA_ATTR,
    INSIGHTS_SUGGEST_NAME_DATA_ATTR,
    INSIGHTS_SUGGEST_ROW_SELECTOR,
} from '../insights/insightsDomSelectors.js';
import { SUGGESTIONS_PANEL_ELEMENT_ID } from '../suggestionsDomIds.js';
import { setActiveTab, TAB_ID_BUILDER } from '../tabs.js';
import { NATIVE_BUTTON_SELECTOR } from '../utils/dom.js';
import { DOM_EVENT_CLICK, DOM_EVENT_KEYDOWN } from '../utils/domEventNames.js';
import { KEY_ENTER, KEY_SPACE } from '../utils/keyboardKeys.js';
import { MSG_ADD_CARD_BLOCKED, MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT } from '../utils/userDialogMessages.js';

export function bindSuggestionsFindCard(): void {
    document.addEventListener(DOM_EVENT_CLICK, (e: Event) => {
        const el = (e.target as HTMLElement).closest(INSIGHTS_FIND_CARD_SELECTOR);
        if (!el || !(el instanceof HTMLButtonElement)) return;
        const panel = document.getElementById(SUGGESTIONS_PANEL_ELEMENT_ID);
        if (!panel?.contains(el)) return;
        const name = el.getAttribute(INSIGHTS_FIND_CARD_DATA_ATTR);
        if (!name) return;
        e.preventDefault();
        setActiveTab(TAB_ID_BUILDER);
        requestAnimationFrame(() => runSearchWithQuery(name));
    });
}

async function addSuggestedCardToDeck(name: string, section?: DeckSection): Promise<void> {
    const card = pickBestCardFromSearchResults(await fetchSearchResultsForQuery(name), name);
    if (!card) {
        alert(MSG_SUGGESTIONS_SEARCH_NAME_TOO_SHORT);
        return;
    }
    const ok = await addToDeck(card, section);
    if (!ok) {
        alert(MSG_ADD_CARD_BLOCKED);
    }
}

/** Clic sur une proposition Number Xyz (ligne) ou sur une vignette Main/Side. */
export function bindSuggestionsAddToDeck(): void {
    document.addEventListener(DOM_EVENT_CLICK, (e: Event) => {
        const panel = document.getElementById(SUGGESTIONS_PANEL_ELEMENT_ID);
        const t = e.target as HTMLElement;
        if (!panel?.contains(t)) return;
        if (t.closest(NATIVE_BUTTON_SELECTOR)) return;

        const chip = t.closest(INSIGHTS_ADD_DECK_CARD_SELECTOR);
        if (chip) {
            const name = chip.getAttribute(INSIGHTS_CARD_NAME_DATA_ATTR);
            const section = chip.getAttribute(INSIGHTS_SECTION_DATA_ATTR);
            if (!name || !section || !isDeckSectionMainSide(section)) return;
            e.preventDefault();
            void addSuggestedCardToDeck(name, section);
            return;
        }

        const row = t.closest(INSIGHTS_SUGGEST_ROW_SELECTOR);
        if (row) {
            const name = row.getAttribute(INSIGHTS_SUGGEST_NAME_DATA_ATTR);
            if (!name) return;
            e.preventDefault();
            void addSuggestedCardToDeck(name);
        }
    });

    document.addEventListener(DOM_EVENT_KEYDOWN, (e: KeyboardEvent) => {
        if (e.key !== KEY_ENTER && e.key !== KEY_SPACE) return;
        const panel = document.getElementById(SUGGESTIONS_PANEL_ELEMENT_ID);
        const t = e.target as HTMLElement;
        if (!panel?.contains(t)) return;
        const chip = t.closest(INSIGHTS_ADD_DECK_CARD_SELECTOR);
        if (!chip) return;
        e.preventDefault();
        const name = chip.getAttribute(INSIGHTS_CARD_NAME_DATA_ATTR);
        const section = chip.getAttribute(INSIGHTS_SECTION_DATA_ATTR);
        if (!name || !section || !isDeckSectionMainSide(section)) return;
        void addSuggestedCardToDeck(name, section);
    });
}
