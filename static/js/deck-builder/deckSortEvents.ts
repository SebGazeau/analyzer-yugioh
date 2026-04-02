/** Événement global quand l’ordre / structure Main (tri DnD) change. */

export const DECK_SORT_CHANGED_EVENT = 'deck-sort-changed';

export function dispatchDeckSortChanged(): void {
    window.dispatchEvent(new CustomEvent(DECK_SORT_CHANGED_EVENT));
}
