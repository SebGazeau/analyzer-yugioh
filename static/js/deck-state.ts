/**
 * Logique pure du deck (sans DOM) pour tests et réutilisation.
 * Section D du plan de migration — fonctions testables sans effet de bord.
 */

import { maxCardsForZone } from './deck-move.js';
import {
    DECK_SECTIONS,
    emptyArraysByDeckSection,
    mapDeckSections,
    type DeckSection,
    type DeckSectionCounts,
} from './deckSection.js';

export type { DeckSection };

export interface DeckEntry {
    id: number;
    name: string;
    quantity: number;
    engine?: string;
    categories?: string[];
}

export interface DeckState {
    main: DeckEntry[];
    extra: DeckEntry[];
    side: DeckEntry[];
}

/** Snapshot neuf : trois zones vides (tests, pas de mutation partagée si rappelé à chaque test). */
export function createEmptyDeckState(): DeckState {
    return { ...emptyArraysByDeckSection<DeckEntry>() };
}

const MAX_COPIES = 3;
const MIN_MAIN = 40;

function sectionCount(entries: DeckEntry[]): number {
    return entries.reduce((s, e) => s + e.quantity, 0);
}

function copiesInSection(entries: DeckEntry[], cardId: number): number {
    const e = entries.find((x) => x.id === cardId);
    return e ? e.quantity : 0;
}

function addOrIncrement(
    entries: DeckEntry[],
    card: { id: number; name: string; engine?: string; categories?: string[] },
    maxInSection: number,
): { entries: DeckEntry[]; ok: boolean } {
    const total = sectionCount(entries);
    if (total >= maxInSection) return { entries: [...entries], ok: false };

    const existing = entries.find((x) => x.id === card.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= MAX_COPIES) return { entries: [...entries], ok: false };

    const newQty = currentQty + 1;
    const newEntries = existing
        ? entries.map((e) => (e.id === card.id ? { ...e, quantity: newQty } : e))
        : [...entries, { id: card.id, name: card.name, quantity: 1, engine: card.engine, categories: card.categories }];
    return { entries: newEntries, ok: true };
}

/** Retourne le nombre total de cartes (main + extra + side). */
export function getDeckSize(state: DeckState): number {
    return DECK_SECTIONS.reduce((sum, s) => sum + sectionCount(state[s]), 0);
}

/** Vérifie les limites officielles : main 40–60, extra ≤15, side ≤15. */
export function isLegal(state: DeckState): boolean {
    const c: DeckSectionCounts = mapDeckSections((s) => sectionCount(state[s]));
    return (
        c.main >= MIN_MAIN &&
        c.main <= maxCardsForZone('main') &&
        c.extra <= maxCardsForZone('extra') &&
        c.side <= maxCardsForZone('side')
    );
}

/** Ajoute une carte dans la section donnée (ou déduite si extra). Respecte 3 exemplaires et taille de zone. */
export function addCard(
    state: DeckState,
    card: { id: number; name: string; type?: string; engine?: string; categories?: string[] },
    section?: DeckSection,
): { state: DeckState; ok: boolean } {
    const isExtra = (t: string) =>
        /fusion|synchro|xyz|link/i.test(t || '');
    const targetSection: DeckSection = section ?? (isExtra(card.type || '') ? 'extra' : 'main');

    const max = maxCardsForZone(targetSection);
    const current = state[targetSection];
    const { entries: nextEntries, ok } = addOrIncrement(current, card, max);
    if (!ok) return { state: { ...state }, ok: false };

    return {
        state: {
            ...state,
            [targetSection]: nextEntries,
        },
        ok: true,
    };
}

/** Retire une copie de la carte dans la section. Si dernière copie, retire l'entrée. */
export function removeCard(
    state: DeckState,
    cardId: number,
    section: DeckSection,
): DeckState {
    const entries = state[section].map((e) => {
        if (e.id !== cardId) return e;
        if (e.quantity <= 1) return null;
        return { ...e, quantity: e.quantity - 1 };
    }).filter((e): e is DeckEntry => e !== null);
    return { ...state, [section]: entries };
}

const YDK_SECTION_OPEN: Record<DeckSection, string> = {
    main: '#main',
    extra: '#extra',
    side: '!side',
};

/** Export YDK : #main, #extra, !side, une ligne par id de carte (répété quantity fois). */
export function exportDeckToYDK(state: DeckState): string {
    const lines: string[] = ['#created by ...'];
    for (const s of DECK_SECTIONS) {
        lines.push(YDK_SECTION_OPEN[s]);
        for (const e of state[s]) {
            for (let i = 0; i < e.quantity; i++) lines.push(String(e.id));
        }
    }
    return lines.join('\n');
}

/** Import YDK : parse les blocs #main, #extra, !side et agrège par id. */
export function importDeckFromYDK(ydk: string): { state: DeckState; error?: string } {
    const sections = emptyArraysByDeckSection<DeckEntry>();
    let section: DeckSection = 'main';
    const lines = ydk.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
            if (trimmed.toLowerCase() === '#extra') section = 'extra';
            else if (trimmed.toLowerCase() === '#main') section = 'main';
            continue;
        }
        if (trimmed.toLowerCase() === '!side') {
            section = 'side';
            continue;
        }
        const id = parseInt(trimmed, 10);
        if (Number.isNaN(id) || trimmed !== String(id)) continue; // comment or invalid

        const arr = sections[section];
        const existing = arr.find((e) => e.id === id);
        if (existing) existing.quantity += 1;
        else arr.push({ id, name: '', quantity: 1 });
    }

    return { state: { ...sections } };
}
