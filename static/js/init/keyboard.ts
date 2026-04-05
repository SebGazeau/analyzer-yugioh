/**
 * Raccourcis clavier : Ctrl+F focus recherche, Escape vide/ferme, Enter ajoute premier résultat.
 */
import { focusSearch, clearSearch } from '../search.js';
import { SEARCH_BOX_ELEMENT_ID, SEARCH_RESULTS_FIRST_ADD_BUTTON_SELECTOR } from '../searchDomIds.js';

export function bindKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            focusSearch();
            return;
        }
        if (e.key === 'Escape') {
            clearSearch();
            return;
        }
        if (e.key === 'Enter' && (document.activeElement as HTMLElement)?.id === SEARCH_BOX_ELEMENT_ID) {
            const first = document.querySelector(SEARCH_RESULTS_FIRST_ADD_BUTTON_SELECTOR) as HTMLElement | null;
            if (first) first.click();
        }
    });
}
