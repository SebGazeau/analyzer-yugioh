/**
 * DOM : compteurs Main (types), barres builder, résumé MAIN/EXTRA/SIDE, panneaux composition.
 */

import {
    DECK_SECTIONS,
    mapDeckSections,
    type DeckSection,
    type DeckSectionCounts,
} from '../deckSection.js';
import { DECK_COUNT_SUMMARY_ELEMENT_ID } from './builderShellDomIds.js';
import {
    BUILDER_BAR_MONSTER_ID,
    BUILDER_BAR_SPELL_ID,
    BUILDER_BAR_TRAP_ID,
    BUILDER_COMPOSITION_DETAIL_MONSTER_ID,
    BUILDER_COMPOSITION_DETAIL_SPELL_ID,
    BUILDER_COMPOSITION_DETAIL_TRAP_ID,
    BUILDER_COUNT_MONSTER_ID,
    BUILDER_COUNT_SPELL_ID,
    BUILDER_COUNT_TRAP_ID,
} from './builderStatsDomIds.js';
import type { MainDeckTypeCounts } from './mainDeckTypeCounts.js';

const DECK_COUNT_LABEL: Record<DeckSection, string> = mapDeckSections((s) => s.toUpperCase());

/** IDs `#deck-main-count`, etc. — réutilisable par les tests (jsdom). */
export const DECK_COUNT_ELEMENT_ID: Record<DeckSection, string> = mapDeckSections(
    (s) => `deck-${s}-count`,
);

export function applyBuilderMainTypeCountsAndBars(counts: MainDeckTypeCounts): void {
    const { monsters, spells, traps } = counts;
    const monsterEl = document.getElementById(BUILDER_COUNT_MONSTER_ID);
    if (monsterEl) monsterEl.textContent = String(monsters);
    const spellEl = document.getElementById(BUILDER_COUNT_SPELL_ID);
    if (spellEl) spellEl.textContent = String(spells);
    const trapEl = document.getElementById(BUILDER_COUNT_TRAP_ID);
    if (trapEl) trapEl.textContent = String(traps);

    const total = monsters + spells + traps;
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
    const barMonster = document.getElementById(BUILDER_BAR_MONSTER_ID);
    if (barMonster) barMonster.style.width = pct(monsters) + '%';
    const barSpell = document.getElementById(BUILDER_BAR_SPELL_ID);
    if (barSpell) barSpell.style.width = pct(spells) + '%';
    const barTrap = document.getElementById(BUILDER_BAR_TRAP_ID);
    if (barTrap) barTrap.style.width = pct(traps) + '%';
}

export function applyDeckSectionCountLabels(counts: DeckSectionCounts): void {
    const summaryEl = document.getElementById(DECK_COUNT_SUMMARY_ELEMENT_ID);
    if (summaryEl) {
        summaryEl.textContent = DECK_SECTIONS.map((s) => `${counts[s]} ${DECK_COUNT_LABEL[s]}`).join(' / ');
    }
    for (const s of DECK_SECTIONS) {
        const el = document.getElementById(DECK_COUNT_ELEMENT_ID[s]);
        if (el) el.textContent = String(counts[s]);
    }
}

export function applyCompositionDetailPanelsHtml(html: {
    monsterDetail: string;
    spellDetail: string;
    trapDetail: string;
}): void {
    const monsterDetailEl = document.getElementById(BUILDER_COMPOSITION_DETAIL_MONSTER_ID);
    const spellDetailEl = document.getElementById(BUILDER_COMPOSITION_DETAIL_SPELL_ID);
    const trapDetailEl = document.getElementById(BUILDER_COMPOSITION_DETAIL_TRAP_ID);
    if (monsterDetailEl) monsterDetailEl.innerHTML = html.monsterDetail;
    if (spellDetailEl) spellDetailEl.innerHTML = html.spellDetail;
    if (trapDetailEl) trapDetailEl.innerHTML = html.trapDetail;
}
