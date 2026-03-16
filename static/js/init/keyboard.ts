/**
 * Raccourcis clavier : Ctrl+F focus recherche, Escape vide/ferme, Enter ajoute premier résultat.
 */
import { focusSearch, clearSearch } from '../search.js';

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
        if (e.key === 'Enter' && (document.activeElement as HTMLElement)?.id === 'search-box') {
            const first = document.querySelector('#search-results-list .search-result-add') as HTMLElement | null;
            if (first) first.click();
        }
    });
}
