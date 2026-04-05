/**
 * DOM : compteurs Main (types), barres builder, résumé MAIN/EXTRA/SIDE, panneaux composition.
 */

import { DECK_SECTIONS, type DeckSection, type DeckSectionCounts } from '../deckSection.js';
import type { MainDeckTypeCounts } from './mainDeckTypeCounts.js';

const DECK_COUNT_LABEL: Record<DeckSection, string> = {
    main: 'MAIN',
    extra: 'EXTRA',
    side: 'SIDE',
};

const DECK_COUNT_ELEMENT_ID: Record<DeckSection, string> = {
    main: 'deck-main-count',
    extra: 'deck-extra-count',
    side: 'deck-side-count',
};

export function applyBuilderMainTypeCountsAndBars(counts: MainDeckTypeCounts): void {
    const { monsters, spells, traps } = counts;
    const monsterEl = document.getElementById('count-monster');
    if (monsterEl) monsterEl.textContent = String(monsters);
    const spellEl = document.getElementById('count-spell');
    if (spellEl) spellEl.textContent = String(spells);
    const trapEl = document.getElementById('count-trap');
    if (trapEl) trapEl.textContent = String(traps);

    const total = monsters + spells + traps;
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
    const barMonster = document.getElementById('builder-bar-monster');
    if (barMonster) barMonster.style.width = pct(monsters) + '%';
    const barSpell = document.getElementById('builder-bar-spell');
    if (barSpell) barSpell.style.width = pct(spells) + '%';
    const barTrap = document.getElementById('builder-bar-trap');
    if (barTrap) barTrap.style.width = pct(traps) + '%';
}

export function applyDeckSectionCountLabels(counts: DeckSectionCounts): void {
    const summaryEl = document.getElementById('deck-count-summary');
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
    const monsterDetailEl = document.getElementById('builder-composition-detail-monster');
    const spellDetailEl = document.getElementById('builder-composition-detail-spell');
    const trapDetailEl = document.getElementById('builder-composition-detail-trap');
    if (monsterDetailEl) monsterDetailEl.innerHTML = html.monsterDetail;
    if (spellDetailEl) spellDetailEl.innerHTML = html.spellDetail;
    if (trapDetailEl) trapDetailEl.innerHTML = html.trapDetail;
}
