/** Zones deck officielles : Main, Extra, Side (ordre d’itération = affichage builder). */

export const DECK_SECTIONS = ['main', 'extra', 'side'] as const;
export type DeckSection = (typeof DECK_SECTIONS)[number];

/** Construit un `Record<DeckSection, T>` dans l’ordre canonique (évite de dupliquer `Object.fromEntries` + `map`). */
export function mapDeckSections<T>(perSection: (section: DeckSection) => T): Record<DeckSection, T> {
    return Object.fromEntries(DECK_SECTIONS.map((s) => [s, perSection(s)])) as Record<DeckSection, T>;
}

/** Un tableau vide par zone (état initial, import YDK, etc.). */
export function emptyArraysByDeckSection<T>(): Record<DeckSection, T[]> {
    return mapDeckSections(() => [] as T[]);
}

/**
 * Au moins une clé `main` / `extra` / `side` a une valeur truthy (ex. import JSON).
 * Note : `[]` est truthy en JS ; un objet `{ main: [] }` est donc accepté comme « présent ».
 */
export function hasTruthyDeckSectionData(o: object): boolean {
    const r = o as Partial<Record<DeckSection, unknown>>;
    return DECK_SECTIONS.some((s) => Boolean(r[s]));
}

/** Nombre de cartes par zone (builder / résumé). */
export type DeckSectionCounts = Record<DeckSection, number>;

/** Main ou Side uniquement (pas Extra) — cibles d’ajout depuis Suggestions / insights. */
export type DeckSectionMainSide = Extract<DeckSection, 'main' | 'side'>;

/** Valide une chaîne issue du DOM (`data-deck-cell-section`, JSON DnD, etc.). */
export function isDeckSection(value: string): value is DeckSection {
    return (DECK_SECTIONS as readonly string[]).includes(value);
}

export function isDeckSectionMainSide(value: string): value is DeckSectionMainSide {
    return value === 'main' || value === 'side';
}

const MAIN_SIDE_SHORT_LABEL: Record<DeckSectionMainSide, string> = {
    main: 'Main',
    side: 'Side',
};

/** Libellé court UI pour puce / tooltip (Suggestions, etc.). */
export function deckSectionMainSideShortLabel(section: DeckSectionMainSide): string {
    return MAIN_SIDE_SHORT_LABEL[section];
}

const MAIN_SIDE_SORT_KEY: Record<DeckSectionMainSide, number> = {
    main: 0,
    side: 1,
};

/** Clé de tri : Main avant Side (tie-break après le nom). */
export function deckSectionMainSideSortKey(section: DeckSectionMainSide): number {
    return MAIN_SIDE_SORT_KEY[section];
}
