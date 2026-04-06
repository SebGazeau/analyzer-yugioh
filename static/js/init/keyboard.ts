/**
 * Raccourcis clavier : Ctrl+F focus recherche, Escape vide/ferme, Enter ajoute premier résultat.
 */
import { focusSearch, clearSearch } from '../search.js';
import { DOM_EVENT_KEYDOWN } from '../utils/domEventNames.js';
import { KEY_ENTER, KEY_ESCAPE, KEY_F } from '../utils/keyboardKeys.js';
import { SEARCH_BOX_ELEMENT_ID, SEARCH_RESULTS_FIRST_ADD_BUTTON_SELECTOR } from '../searchDomIds.js';

export function bindKeyboard(): void {
    document.addEventListener(DOM_EVENT_KEYDOWN, (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === KEY_F) {
            e.preventDefault();
            focusSearch();
            return;
        }
        if (e.key === KEY_ESCAPE) {
            clearSearch();
            return;
        }
        if (e.key === KEY_ENTER && (document.activeElement as HTMLElement)?.id === SEARCH_BOX_ELEMENT_ID) {
            const first = document.querySelector(SEARCH_RESULTS_FIRST_ADD_BUTTON_SELECTOR) as HTMLElement | null;
            if (first) first.click();
        }
    });
}
