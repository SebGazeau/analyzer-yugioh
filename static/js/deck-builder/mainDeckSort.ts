/**
 * Tri du Main Deck (type, catégorie) + utilitaire type monstre/sort/piège pour la grille.
 */

import { dispatchDeckSortChanged } from './deckSortEvents.js';

export type MainDeckSortBy = 'none' | 'type' | 'category';
export type MainDeckSortDir = 'asc' | 'desc';

export interface MainDeckSortableRow {
    type: string;
    categories: string[];
}

export function deckCardTypeKind(type: string): 'monster' | 'spell' | 'trap' {
    const t = type.toLowerCase();
    if (t.includes('monster')) return 'monster';
    if (t.includes('spell')) return 'spell';
    if (t.includes('trap')) return 'trap';
    return 'monster';
}

function typeOrder(row: MainDeckSortableRow): number {
    const k = deckCardTypeKind(row.type);
    return k === 'monster' ? 0 : k === 'spell' ? 1 : 2;
}

export function sortMainDeckInPlace(
    mainDeck: MainDeckSortableRow[],
    state: { by: MainDeckSortBy; category: string | null; dir: MainDeckSortDir },
): void {
    if (state.by === 'none') return;
    const dirMul = state.dir === 'asc' ? 1 : -1;
    if (state.by === 'type') {
        mainDeck.sort((a, b) => dirMul * (typeOrder(a) - typeOrder(b)));
        return;
    }
    if (state.by === 'category' && state.category !== null) {
        const cat = state.category;
        mainDeck.sort((a, b) => {
            const aHas = a.categories && a.categories.includes(cat) ? 1 : 0;
            const bHas = b.categories && b.categories.includes(cat) ? 1 : 0;
            if (aHas !== bHas) return dirMul * (bHas - aHas);
            return dirMul * (typeOrder(a) - typeOrder(b));
        });
        return;
    }
    mainDeck.sort((a, b) => {
        const aCat = (a.categories && a.categories[0]) ?? '';
        const bCat = (b.categories && b.categories[0]) ?? '';
        const cmp = aCat.localeCompare(bCat);
        if (cmp !== 0) return dirMul * cmp;
        return dirMul * (typeOrder(a) - typeOrder(b));
    });
}

export interface MainDeckSortStore {
    getState(): { by: MainDeckSortBy; category: string | null; dir: MainDeckSortDir };
    setByType(): void;
    setByCategory(categoryName: string | null): void;
    /** Comme cleanCardTable : none + catégorie nulle + dir asc. */
    resetForCleanTable(): void;
    /** Après DnD / changement structure : none + catégorie nulle (dir inchangé). */
    clearAfterStructureChange(): void;
}

export function createMainDeckSortStore(deps: {
    getMainDeck: () => MainDeckSortableRow[];
    renderMain: () => void;
    afterVisualUpdate: () => void;
}): MainDeckSortStore {
    let by: MainDeckSortBy = 'none';
    let category: string | null = null;
    let dir: MainDeckSortDir = 'asc';

    function refreshSortedMain(): void {
        sortMainDeckInPlace(deps.getMainDeck(), { by, category, dir });
        deps.renderMain();
        deps.afterVisualUpdate();
        dispatchDeckSortChanged();
    }

    return {
        getState: () => ({ by, category, dir }),

        setByType(): void {
            if (by === 'type') {
                if (dir === 'asc') {
                    dir = 'desc';
                } else {
                    by = 'none';
                    dir = 'asc';
                    return;
                }
            } else {
                by = 'type';
                category = null;
                dir = 'asc';
            }
            refreshSortedMain();
        },

        setByCategory(categoryName: string | null): void {
            if (by === 'category' && category === categoryName) {
                if (dir === 'asc') {
                    dir = 'desc';
                } else {
                    by = 'none';
                    category = null;
                    dir = 'asc';
                    sortMainDeckInPlace(deps.getMainDeck(), { by, category, dir });
                    deps.renderMain();
                    deps.afterVisualUpdate();
                    dispatchDeckSortChanged();
                    return;
                }
            }
            by = 'category';
            category = categoryName;
            dir = 'asc';
            refreshSortedMain();
        },

        resetForCleanTable(): void {
            by = 'none';
            category = null;
            dir = 'asc';
        },

        clearAfterStructureChange(): void {
            by = 'none';
            category = null;
        },
    };
}
