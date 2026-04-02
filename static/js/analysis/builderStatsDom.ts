/**
 * DOM : compteurs Main (types), barres builder, résumé MAIN/EXTRA/SIDE, panneaux composition.
 */

import type { MainDeckTypeCounts } from './mainDeckTypeCounts.js';

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

export function applyDeckSectionCountLabels(main: number, extra: number, side: number): void {
    const summaryEl = document.getElementById('deck-count-summary');
    if (summaryEl) summaryEl.textContent = `${main} MAIN / ${extra} EXTRA / ${side} SIDE`;
    const mainEl = document.getElementById('deck-main-count');
    if (mainEl) mainEl.textContent = String(main);
    const extraEl = document.getElementById('deck-extra-count');
    if (extraEl) extraEl.textContent = String(extra);
    const sideEl = document.getElementById('deck-side-count');
    if (sideEl) sideEl.textContent = String(side);
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
