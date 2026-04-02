// Statistiques et probabilités pour le deck
import { refreshDeckInsightsPanel } from './insights/panel.js';
import { getDeckState } from './deck.js';
import { CATEGORY_GROUPS } from './category.js';
import {
    cumulativeHypergeometric,
    getAllCategories,
    simulateDrawCounts,
    type ProbabilityCardEntry,
} from './analysis/probabilityMath.js';

export type { ProbabilityCardEntry } from './analysis/probabilityMath.js';
export {
    hypergeometricDist,
    hypergeometric,
    cumulativeHypergeometric,
    probabilityAtLeast,
    getTotalCardCount,
    getCategoryCardCount,
    firstHandProbability,
    secondHandProbability,
    simulateDraw,
    simulateDrawCounts,
} from './analysis/probabilityMath.js';

interface SummaryMap {
    [key: string]: Map<string, number>;
}

/** Cartes "tirées" dans la simulation (noms, ordre de tirage). */
let drawnCards: string[] = [];

const HAND_SIZE_STORAGE_KEY = 'yugioh-deck-hand-size';

function loadHandSizeFromStorage(): 5 | 6 {
    try {
        const v = localStorage.getItem(HAND_SIZE_STORAGE_KEY);
        if (v === '6') return 6;
        if (v === '5') return 5;
    } catch (_) {}
    return 5;
}

/** Taille de la main de départ : 5 (going first) ou 6 (going second). Persistée en localStorage. */
let handSize: 5 | 6 = loadHandSizeFromStorage();

export function setHandSize(size: 5 | 6): void {
    if (handSize === size) return;
    handSize = size;
    try {
        localStorage.setItem(HAND_SIZE_STORAGE_KEY, String(size));
    } catch (_) {}
    updateProbabilities();
    updateCategorySummary();
    updateDrawSimulationUI();
}

export function getHandSize(): 5 | 6 {
    return handSize;
}

/** Met à jour le titre de la section Analysis (ex. "Dragon Rulers — "). Appelé au chargement / reset du deck. */
export function setAnalysisDeckName(name: string): void {
    const el = document.getElementById("analysis-deck-name");
    if (!el) return;
    const text = name.trim();
    el.textContent = text ? `${text} — ` : "";
}

function cleanCardName(s: string): string {
    return s.replace(/^—\s*/, '').trim();
}

/** Snapshot du Main Deck (nom, qty, engine, catégories). */
function getDeckMainSnapshot(): { name: string; qty: number; engine: string; categories: string[] }[] {
    const main = getDeckState().main;
    return main
        .filter(r => r.name && r.quantity > 0)
        .map(r => ({ name: r.name, qty: r.quantity, engine: r.engine || '', categories: r.categories || [] }));
}

/** Compte combien de fois une carte a été tirée. */
function countDrawn(cardName: string): number {
    return drawnCards.filter(n => n === cardName).length;
}

/** Retourne l'URL d'image d'une carte du Main, ou null. */
function getCardImageUrl(cardName: string): string | null {
    const want = cleanCardName(cardName);
    const row = getDeckState().main.find(r => cleanCardName(r.name) === want);
    return row?.imageUrl ?? null;
}

/** Résumé et totaux pour le deck *restant* (après simulation). */
function getRemainingSummary(): { summary: SummaryMap; engineSummary: SummaryMap; totalCards: number; numDraws: number } {
    const snapshot = getDeckMainSnapshot();
    const summary: SummaryMap = {};
    const engineSummary: SummaryMap = {};
    let totalCards = 0;
    for (const card of snapshot) {
        const remaining = Math.max(0, card.qty - countDrawn(card.name));
        if (remaining === 0) continue;
        totalCards += remaining;
        card.categories.forEach((cat: string) => {
            if (!summary[cat]) summary[cat] = new Map<string, number>();
            summary[cat].set(card.name, (summary[cat].get(card.name) || 0) + remaining);
        });
        if (card.engine && card.engine.trim() !== '') {
            if (!engineSummary[card.engine]) engineSummary[card.engine] = new Map<string, number>();
            engineSummary[card.engine].set(card.name, (engineSummary[card.engine].get(card.name) || 0) + remaining);
        }
    }
    const numDraws = Math.min(handSize, handSize - drawnCards.length);
    return { summary, engineSummary, totalCards, numDraws };
}

/** Tire une carte au hasard dans le deck restant (pondéré par les quantités). Retourne le nom ou null. */
export function drawOneCard(): string | null {
    const snapshot = getDeckMainSnapshot();
    const deck: string[] = [];
    snapshot.forEach(card => {
        const remaining = Math.max(0, card.qty - countDrawn(card.name));
        for (let i = 0; i < remaining; i++) deck.push(card.name);
    });
    if (deck.length === 0 || drawnCards.length >= 5) return null;
    const idx = Math.floor(Math.random() * deck.length);
    const drawn = deck[idx];
    drawnCards.push(drawn);
    updateDrawSimulationUI();
    updateCategorySummary();
    return drawn;
}

/** Réinitialise la simulation de tirage. */
export function resetDrawSimulation(): void {
    drawnCards = [];
    updateDrawSimulationUI();
    updateCategorySummary();
}

export function getDrawnCards(): string[] {
    return [...drawnCards];
}

function updateDrawSimulationUI(): void {
    const container = document.getElementById('draw-simulation-list');
    const countEl = document.getElementById('draw-simulation-count');
    const btnDraw = document.getElementById('btn-draw-one') as HTMLButtonElement | null;
    if (countEl) countEl.textContent = String(drawnCards.length);
    const maxEl = document.getElementById('draw-simulation-max');
    if (maxEl) maxEl.textContent = String(handSize);
    if (container) {
        container.textContent = '';
        if (drawnCards.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'draw-simulation-empty';
            empty.textContent = '—';
            container.appendChild(empty);
        } else {
            for (const name of drawnCards) {
                const url = getCardImageUrl(name);
                if (url) {
                    const img = document.createElement('img');
                    img.className = 'draw-simulation-thumb';
                    img.src = url;
                    img.alt = name;
                    img.loading = 'lazy';
                    img.title = name;
                    container.appendChild(img);
                } else {
                    const span = document.createElement('span');
                    span.className = 'draw-simulation-thumb-placeholder';
                    span.textContent = name;
                    span.title = name;
                    container.appendChild(span);
                }
            }
            const lastChild = container.lastElementChild;
            if (lastChild) lastChild.classList.add('draw-simulation-thumb--reveal');
        }
    }
    if (btnDraw) {
        const snapshot = getDeckMainSnapshot();
        const totalInDeck = snapshot.reduce((s, c) => s + c.qty, 0);
        const remaining = totalInDeck - drawnCards.length;
        btnDraw.disabled = drawnCards.length >= handSize || remaining <= 0;
    }
}

export interface CompositionBreakdown {
  monsters: { byAttribute: Record<string, number>; byLevel: Record<string, number>; byRace: Record<string, number> };
  spells: { byRace: Record<string, number> };
  traps: { byRace: Record<string, number> };
}

function getCompositionBreakdown(): CompositionBreakdown {
  const main = getDeckState().main;
  const monsters = { byAttribute: {} as Record<string, number>, byLevel: {} as Record<string, number>, byRace: {} as Record<string, number> };
  const spells = { byRace: {} as Record<string, number> };
  const traps = { byRace: {} as Record<string, number> };

  main.forEach(row => {
    const type = (row.type || '').toLowerCase();
    const qty = row.quantity;
    const key = (v: string) => v || '—';
    if (type.includes('monster')) {
      const attr = key(row.attribute ?? '');
      monsters.byAttribute[attr] = (monsters.byAttribute[attr] || 0) + qty;
      const lvl = row.level != null ? `Niveau ${row.level}` : '—';
      monsters.byLevel[lvl] = (monsters.byLevel[lvl] || 0) + qty;
      const race = key(row.race ?? '');
      monsters.byRace[race] = (monsters.byRace[race] || 0) + qty;
    } else if (type.includes('spell')) {
      const race = key(row.race ?? '');
      spells.byRace[race] = (spells.byRace[race] || 0) + qty;
    } else if (type.includes('trap')) {
      const race = key(row.race ?? '');
      traps.byRace[race] = (traps.byRace[race] || 0) + qty;
    }
  });

  return { monsters, spells, traps };
}

function renderBreakdownList(counts: Record<string, number>, total: number): string {
  const entries = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '<p class="builder-composition-detail-empty">Aucun détail</p>';
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(0) : '0');
  return entries
    .map(([label, n]) => `<div class="builder-composition-detail-row"><span class="builder-composition-detail-label">${escapeHtml(label)}</span><span class="builder-composition-detail-count">${n}</span><span class="builder-composition-detail-pct">${pct(n)}%</span></div>`)
    .join('');
}

function refreshCompositionDetails(): void {
  const breakdown = getCompositionBreakdown();
  const totalMonsters = Object.values(breakdown.monsters.byAttribute).reduce((a, b) => a + b, 0);
  const totalSpells = Object.values(breakdown.spells.byRace).reduce((a, b) => a + b, 0);
  const totalTraps = Object.values(breakdown.traps.byRace).reduce((a, b) => a + b, 0);

  const monsterDetail = document.getElementById('builder-composition-detail-monster');
  const spellDetail = document.getElementById('builder-composition-detail-spell');
  const trapDetail = document.getElementById('builder-composition-detail-trap');

  if (monsterDetail) {
    const parts: string[] = [];
    if (Object.keys(breakdown.monsters.byAttribute).length) parts.push('<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Attribut</div>' + renderBreakdownList(breakdown.monsters.byAttribute, totalMonsters) + '</div>');
    if (Object.keys(breakdown.monsters.byLevel).length) parts.push('<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Niveau / Rang</div>' + renderBreakdownList(breakdown.monsters.byLevel, totalMonsters) + '</div>');
    if (Object.keys(breakdown.monsters.byRace).length) parts.push('<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Type (race)</div>' + renderBreakdownList(breakdown.monsters.byRace, totalMonsters) + '</div>');
    monsterDetail.innerHTML = parts.length ? parts.join('') : '<p class="builder-composition-detail-empty">Aucun monstre dans le Main</p>';
  }
  if (spellDetail) {
    spellDetail.innerHTML = totalSpells > 0
      ? '<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Sous-type</div>' + renderBreakdownList(breakdown.spells.byRace, totalSpells) + '</div>'
      : '<p class="builder-composition-detail-empty">Aucune magie dans le Main</p>';
  }
  if (trapDetail) {
    trapDetail.innerHTML = totalTraps > 0
      ? '<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Sous-type</div>' + renderBreakdownList(breakdown.traps.byRace, totalTraps) + '</div>'
      : '<p class="builder-composition-detail-empty">Aucun piège dans le Main</p>';
  }
}

export function computeGlobalStats(): void {
  const main = getDeckState().main;
  let monsters = 0, spells = 0, traps = 0;
  main.forEach(row => {
    const type = (row.type || '').toLowerCase();
    const qty = row.quantity;
    if (type.includes("monster")) monsters += qty;
    else if (type.includes("spell")) spells += qty;
    else if (type.includes("trap")) traps += qty;
  });
  const monsterEl = document.getElementById("count-monster");
  if (monsterEl) monsterEl.textContent = monsters.toString();
  const spellEl = document.getElementById("count-spell");
  if (spellEl) spellEl.textContent = spells.toString();
  const trapEl = document.getElementById("count-trap");
  if (trapEl) trapEl.textContent = traps.toString();

  const total = monsters + spells + traps;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const barMonster = document.getElementById("builder-bar-monster");
  if (barMonster) barMonster.style.width = pct(monsters) + "%";
  const barSpell = document.getElementById("builder-bar-spell");
  if (barSpell) barSpell.style.width = pct(spells) + "%";
  const barTrap = document.getElementById("builder-bar-trap");
  if (barTrap) barTrap.style.width = pct(traps) + "%";

  refreshCompositionDetails();
  refreshDeckInsightsPanel();
}

function countInGrid(section: 'main' | 'extra' | 'side'): number {
    const state = getDeckState();
    return state[section].reduce((sum, r) => sum + r.quantity, 0);
}

export function updateDeckCount(): void {
    const main = countInGrid('main');
    const extra = countInGrid('extra');
    const side = countInGrid('side');
    const summaryEl = document.getElementById('deck-count-summary');
    if (summaryEl) summaryEl.textContent = `${main} MAIN / ${extra} EXTRA / ${side} SIDE`;
    const mainEl = document.getElementById('deck-main-count');
    if (mainEl) mainEl.textContent = main.toString();
    const extraEl = document.getElementById('deck-extra-count');
    if (extraEl) extraEl.textContent = extra.toString();
    const sideEl = document.getElementById('deck-side-count');
    if (sideEl) sideEl.textContent = side.toString();
    resetDrawSimulation();
    updateProbabilities();
    updateCategorySummary(); // refait le tableau après reset (deck peut avoir changé)
}

/** Grille cartes : pas de cellule proba par carte ; probas visibles dans l’onglet Analysis. */
export function updateProbabilities(): void {
    const main = getDeckState().main;
    const totalCards = main.reduce((sum, r) => sum + r.quantity, 0);
    if (totalCards === 0) return;
    (window as any).__deckTotalForHandSize = totalCards;
}

function addSectionHeader(tbody: HTMLElement | null, title: string, sectionId?: string): void {
    if (!tbody) return;
    const tr = document.createElement("tr");
    tr.className = "analysis-section-header";
    if (sectionId) {
        tr.setAttribute("data-section-header", sectionId);
        tr.setAttribute("role", "button");
        tr.setAttribute("tabindex", "0");
        tr.setAttribute("aria-expanded", "true");
        tr.innerHTML = `<td colspan="9"><span class="analysis-section-header-toggle" aria-hidden="true">▼</span> <strong>${escapeHtml(title)}</strong></td>`;
    } else {
        tr.innerHTML = `<td colspan="9"><strong>${escapeHtml(title)}</strong></td>`;
    }
    tbody.appendChild(tr);
}

const ANALYSIS_DOT_COLORS = ["zone-main", "zone-extra", "zone-side", "gold", "info", "success", "amber", "danger"];

function analysisCategoryDotClass(index: number): string {
    return "analysis-category-dot analysis-category-dot--" + ANALYSIS_DOT_COLORS[index % ANALYSIS_DOT_COLORS.length];
}

/** Probas P(≥1) … P(≥6) pour `numDraws` tirages sans remise. Retourne toujours 6 valeurs (≥6 = "—" si numDraws < 6). */
function probRow(K: number, totalCards: number, numDraws: number): string[] {
    const probs: string[] = [];
    for (let x = 1; x <= 6; x++) {
        if (x > numDraws || totalCards === 0) {
            probs.push("—");
            continue;
        }
        const p = 1 - cumulativeHypergeometric(x - 1, numDraws, K, totalCards);
        probs.push(Number.isFinite(p) ? (p * 100).toFixed(2) + "%" : "—");
    }
    return probs;
}

export function updateCategorySummary(): void {
    try {
        const tbody = document.getElementById("category-summary-body");
        if (!tbody) return;
        tbody.innerHTML = "";

        let summary: SummaryMap;
        let engineSummary: SummaryMap;
        let totalCards: number;
        let numDraws: number;

        if (drawnCards.length > 0) {
            const rem = getRemainingSummary();
            summary = rem.summary;
            engineSummary = rem.engineSummary;
            totalCards = rem.totalCards;
            numDraws = rem.numDraws;
            addSectionHeader(tbody, `Simulation : ${drawnCards.length} carte(s) tirée(s), ${totalCards} restantes (probas pour ${numDraws} tirage(s) restant(s))`);
        } else {
            const main = getDeckState().main;
            summary = {};
            engineSummary = {};
            totalCards = 0;
            numDraws = handSize;
            main.forEach(row => {
                const cardName = cleanCardName(row.name);
                const qty = row.quantity;
                const engine = row.engine;
                const selected = row.categories || [];
                if (!cardName || qty <= 0) return;
                totalCards += qty;
                selected.forEach((cat: string) => {
                    if (!summary[cat]) summary[cat] = new Map<string, number>();
                    summary[cat].set(cardName, qty);
                });
                if (engine && engine.trim() !== "") {
                    if (!engineSummary[engine]) engineSummary[engine] = new Map<string, number>();
                    engineSummary[engine].set(cardName, qty);
                }
            });
        }

        const pctDeck = (K: number) => (totalCards > 0 ? ((K / totalCards) * 100).toFixed(1) + "%" : "—");
        let dataRowIndex = 0;

        // 1. Engines
        addSectionHeader(tbody, "Engines", "engines");
        Object.entries(engineSummary)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([engineName, cardMap]) => {
                const tr = document.createElement("tr");
                tr.setAttribute("data-section", "engines");
                const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
                const probs = probRow(K, totalCards, numDraws);
                const dotClass = analysisCategoryDotClass(dataRowIndex++);
                tr.innerHTML = `
                    <td><span class="analysis-category-dot ${dotClass}" aria-hidden="true"></span><strong>${escapeHtml(engineName)}</strong></td>
                    <td class="analysis-td-count">${K}</td>
                    <td class="analysis-td-pct">${pctDeck(K)}</td>
                    <td class="analysis-td-prob5">${probs[0]}</td>
                    ${probs.slice(1).map(p => `<td>${p}</td>`).join("")}
                `;
                tbody.appendChild(tr);
            });

        // 2. Catégories
        addSectionHeader(tbody, "Catégories", "categories");
        Object.keys(summary)
            .sort()
            .forEach(cat => {
                const cardMap = summary[cat];
                const K = Array.from(cardMap.values()).reduce((s, v) => s + v, 0);
                const probs = probRow(K, totalCards, numDraws);
                const dotClass = analysisCategoryDotClass(dataRowIndex++);
                const tr = document.createElement("tr");
                tr.setAttribute("data-section", "categories");
                tr.innerHTML = `
                    <td><span class="analysis-category-dot ${dotClass}" aria-hidden="true"></span>${escapeHtml(cat)}</td>
                    <td class="analysis-td-count">${K}</td>
                    <td class="analysis-td-pct">${pctDeck(K)}</td>
                    <td class="analysis-td-prob5">${probs[0]}</td>
                    ${probs.slice(1).map(p => `<td>${p}</td>`).join("")}
                `;
                tbody.appendChild(tr);
            });

        // 3. Groupes de catégories
        addSectionHeader(tbody, "Groupes de catégories", "groupes");
        Object.entries(CATEGORY_GROUPS).forEach(([groupName, includedCats]) => {
            const cardSet = new Map<string, number>();
            includedCats.forEach(cat => {
                if (summary[cat]) {
                    summary[cat].forEach((qty: number, cardName: string) => {
                        if (!cardSet.has(cardName)) cardSet.set(cardName, qty);
                    });
                }
            });
            const K = Array.from(cardSet.values()).reduce((s, v) => s + v, 0);
            const probs = probRow(K, totalCards, numDraws);
            const dotClass = analysisCategoryDotClass(dataRowIndex++);
            const tr = document.createElement("tr");
            tr.setAttribute("data-section", "groupes");
            tr.innerHTML = `
                <td><span class="analysis-category-dot ${dotClass}" aria-hidden="true"></span><strong>${escapeHtml(groupName)}</strong></td>
                <td class="analysis-td-count">${K}</td>
                <td class="analysis-td-pct">${pctDeck(K)}</td>
                <td class="analysis-td-prob5">${probs[0]}</td>
                ${probs.slice(1).map(p => `<td>${p}</td>`).join("")}
            `;
            tbody.appendChild(tr);
        });

        // Hero stats : première engine ou catégorie (ordre alphab.), P(≥1) pour 5, 6 et main courante
        let firstK = 0;
        let firstGroupName: string = "";
        const firstEngine = Object.entries(engineSummary).sort(([a], [b]) => a.localeCompare(b))[0];
        if (firstEngine) {
            firstGroupName = firstEngine[0];
            firstK = Array.from(firstEngine[1].values()).reduce((s, v) => s + v, 0);
        } else {
            const firstCat = Object.keys(summary).sort()[0];
            if (firstCat && summary[firstCat]) {
                firstGroupName = firstCat;
                firstK = Array.from(summary[firstCat].values()).reduce((s, v) => s + v, 0);
            }
        }
        const firstEl = document.getElementById("analysis-hero-first");
        const secondEl = document.getElementById("analysis-hero-second");
        const engineEl = document.getElementById("analysis-hero-engine");
        const enginePct = totalCards > 0 && firstK > 0 ? probRow(firstK, totalCards, handSize)[0] : "—";
        if (firstEl) firstEl.textContent = totalCards > 0 && firstK > 0 ? probRow(firstK, totalCards, 5)[0] : "—";
        if (secondEl) secondEl.textContent = totalCards > 0 && firstK > 0 ? probRow(firstK, totalCards, 6)[0] : "—";
        if (engineEl) engineEl.textContent = enginePct;
        const heroGroupEl = document.getElementById("analysis-hero-group");
        if (heroGroupEl) {
            heroGroupEl.textContent = firstGroupName && totalCards > 0
                ? `Réf. : ${firstGroupName} (${firstK} / ${totalCards} cartes) — P(≥1) en 5 ou 6 tirages.`
                : "";
        }

        const builderFirst = document.getElementById("builder-stats-first");
        const builderSecond = document.getElementById("builder-stats-second");
        const builderEngine = document.getElementById("builder-stats-engine");
        if (builderFirst) builderFirst.textContent = totalCards > 0 && firstK > 0 ? probRow(firstK, totalCards, 5)[0] : "—";
        if (builderSecond) builderSecond.textContent = totalCards > 0 && firstK > 0 ? probRow(firstK, totalCards, 6)[0] : "—";
        if (builderEngine) builderEngine.textContent = enginePct;

        // Mise à jour du sélecteur de catégorie pour l’histogramme (page Analysis)
        updateHistogramCategorySelect(Object.keys(summary).sort());

        // Bande composition Main Deck (catégories, normalisée à 100 %)
        const entries = Object.keys(summary)
            .sort()
            .map(cat => ({
                name: cat,
                K: Array.from(summary[cat].values()).reduce((s, v) => s + v, 0),
            }))
            .filter(e => e.K > 0);
        const sumAll = entries.reduce((s, e) => s + e.K, 0);

        const stripEl = document.getElementById("deck-composition-strip");
        if (stripEl) {
            stripEl.innerHTML = "";
            if (sumAll > 0) {
                entries.forEach(({ name, K }) => {
                    const pct = (K / sumAll) * 100;
                    const seg = document.createElement("div");
                    seg.className = "deck-composition-segment";
                    seg.style.flexBasis = `${pct}%`;
                    seg.setAttribute("title", `${name}: ${K} (${pct.toFixed(1)}%)`);
                    seg.setAttribute("data-category", name);
                    stripEl.appendChild(seg);
                });
            }
        }

        // Sidebar stats : petit bar chart empilé (même données)
        const sidebarBarEl = document.getElementById("deck-stats-category-bar");
        if (sidebarBarEl) {
            sidebarBarEl.innerHTML = "";
            if (sumAll > 0) {
                entries.forEach(({ name, K }) => {
                    const pct = (K / sumAll) * 100;
                    const seg = document.createElement("div");
                    seg.className = "deck-stats-category-segment";
                    seg.style.flexBasis = `${pct}%`;
                    seg.setAttribute("title", `${name}: ${K} (${pct.toFixed(1)}%)`);
                    seg.setAttribute("data-category", name);
                    sidebarBarEl.appendChild(seg);
                });
            }
        }

        // Liste catégories (sidebar) : label + count + barre
        const categoryListEl = document.getElementById("builder-category-list");
        if (categoryListEl) {
            categoryListEl.innerHTML = "";
            if (sumAll > 0) {
                entries.forEach(({ name, K }) => {
                    const pct = (K / sumAll) * 100;
                    const row = document.createElement("div");
                    row.className = "builder-category-list-row";
                    row.setAttribute("data-builder-sort-category", name);
                    row.style.cursor = "pointer";
                    row.title = `Trier le Main Deck : ${name} en premier`;
                    row.innerHTML = `<span class="builder-category-list-label">${escapeHtml(name)}</span><span class="builder-category-list-count">${K}</span><div class="builder-category-list-bar-wrap"><div class="builder-category-list-bar" style="width:${pct}%"></div></div>`;
                    categoryListEl.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

const HISTOGRAM_BAR_MAX_HEIGHT_PX = 120;
const HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX = 56;
const HISTOGRAM_CATEGORY_COLORS = [
    'var(--color-zone-main)',
    'var(--color-zone-extra)',
    'var(--color-zone-side)',
    'var(--color-gold)',
    'var(--color-info)',
    'var(--color-success)',
    'var(--color-amber)',
    'var(--color-danger)',
];

/** Met à jour le &lt;select&gt; des catégories pour l’histogramme (rempli selon le deck). */
export function updateHistogramCategorySelect(categoryNames: string[]): void {
    const select = document.getElementById('draw-histogram-category') as HTMLSelectElement | null;
    if (!select) return;
    const selected = select.value;
    select.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = categoryNames.length === 0 ? '— Aucune catégorie —' : '— Choisir une catégorie —';
    select.appendChild(opt0);
    categoryNames.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === selected) opt.selected = true;
        select.appendChild(opt);
    });
}

/** Remplit le conteneur #draw-simulation-histogram avec les barres (0, 1, 2, ...). */
export function updateHistogramDOM(histogram: Record<number, number>, iterations: number, categoryLabel: string): void {
    const container = document.getElementById('draw-simulation-histogram');
    if (!container) return;

    const buckets = Object.keys(histogram)
        .map(Number)
        .sort((a, b) => a - b);

    container.innerHTML = '';
    container.setAttribute('aria-label', `Distribution sur ${iterations} tirages : ${categoryLabel}`);

    if (buckets.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'draw-histogram-empty';
        msg.textContent = categoryLabel === '—'
            ? 'Deck vide ou aucune catégorie. Assignez des catégories aux cartes (via « Modifier la carte ») pour afficher la distribution.'
            : `Aucune donnée pour "${categoryLabel}".`;
        container.appendChild(msg);
        return;
    }

    const maxCount = Math.max(1, ...Object.values(histogram));
    const wrap = document.createElement('div');
    wrap.className = 'draw-histogram-chart';

    buckets.forEach((k) => {
        const n = histogram[k];
        const pct = iterations > 0 ? (n / iterations) * 100 : 0;
        const heightPx = maxCount > 0 ? (n / maxCount) * HISTOGRAM_BAR_MAX_HEIGHT_PX : 0;

        const barWrap = document.createElement('div');
        barWrap.className = 'draw-histogram-bar-wrap';
        const barTitle = `${k} carte(s) de la catégorie en main : ${n} simulations (${pct.toFixed(1)} %)`;
        barWrap.innerHTML = `
            <div class="draw-histogram-bar" style="height: ${heightPx}px" title="${barTitle}"></div>
            <span class="draw-histogram-label">${k}</span>
            <span class="draw-histogram-count">${n}</span>
        `;
        wrap.appendChild(barWrap);
    });

    container.appendChild(wrap);
}

/** Rend un mini histogramme (une catégorie) avec une couleur du palette. */
function renderMiniHistogram(
    container: HTMLElement,
    categoryName: string,
    histogram: Record<number, number>,
    iterations: number,
    colorIndex: number,
): void {
    const buckets = Object.keys(histogram)
        .map(Number)
        .sort((a, b) => a - b);
    if (buckets.length === 0) return;
    const maxCount = Math.max(1, ...Object.values(histogram));
    const color = HISTOGRAM_CATEGORY_COLORS[colorIndex % HISTOGRAM_CATEGORY_COLORS.length];
    const wrap = document.createElement('div');
    wrap.className = 'draw-histogram-mini';
    wrap.setAttribute('data-category', categoryName);
    const title = document.createElement('div');
    title.className = 'draw-histogram-mini-title';
    title.textContent = categoryName;
    title.style.color = color;
    wrap.appendChild(title);
    const chart = document.createElement('div');
    chart.className = 'draw-histogram-mini-chart';
    buckets.forEach((k) => {
        const n = histogram[k];
        const heightPx = maxCount > 0 ? (n / maxCount) * HISTOGRAM_MINI_BAR_MAX_HEIGHT_PX : 0;
        const barWrap = document.createElement('div');
        barWrap.className = 'draw-histogram-mini-bar-wrap';
        barWrap.innerHTML = `
            <div class="draw-histogram-mini-bar" style="height:${heightPx}px;background:${color}" title="${k} en main : ${n} / ${iterations}"></div>
            <span class="draw-histogram-mini-label">${k}</span>
            <span class="draw-histogram-mini-count">${n}</span>
        `;
        chart.appendChild(barWrap);
    });
    wrap.appendChild(chart);
    container.appendChild(wrap);
}

/** Efface le graphique principal et tous les mini-graphiques par catégorie (à la demande). */
export function clearHistogramGraphs(): void {
    const headingEl = document.getElementById('draw-histogram-heading');
    const explanationEl = document.getElementById('draw-histogram-explanation');
    const allTitleEl = document.getElementById('draw-histogram-all-title');
    const allContainer = document.getElementById('draw-histogram-all-categories');
    if (headingEl) headingEl.textContent = 'Distribution (1000 tirages)';
    if (explanationEl) explanationEl.style.display = 'none';
    if (allTitleEl) allTitleEl.style.display = 'none';
    if (allContainer) allContainer.innerHTML = '';
    updateHistogramDOM({}, 0, '—');
}

/** Lance 1000 simulations et met à jour l'histogramme (catégorie choisie + un mini-graph par catégorie). */
export function runSimulation1000AndUpdateHistogram(): void {
    const snapshot = getDeckMainSnapshot();
    const cards: ProbabilityCardEntry[] = snapshot.map((r) => ({
        name: r.name,
        qty: r.qty,
        categories: r.categories,
    }));
    const categories = getAllCategories(cards).sort();
    if (categories.length === 0 || cards.length === 0) {
        const headingEl = document.getElementById('draw-histogram-heading');
        const explanationEl = document.getElementById('draw-histogram-explanation');
        const allTitleEl = document.getElementById('draw-histogram-all-title');
        const allContainer = document.getElementById('draw-histogram-all-categories');
        if (headingEl) headingEl.textContent = 'Distribution (1000 tirages)';
        if (explanationEl) explanationEl.style.display = 'none';
        if (allTitleEl) allTitleEl.style.display = 'none';
        if (allContainer) allContainer.innerHTML = '';
        updateHistogramDOM({}, 0, '—');
        return;
    }
    const select = document.getElementById('draw-histogram-category') as HTMLSelectElement | null;
    if (select && select.options.length <= 1) {
        updateHistogramCategorySelect(categories);
    }
    const selectedCategory = select?.value && categories.includes(select.value) ? select.value : categories[0];
    if (select && selectedCategory) {
        select.value = selectedCategory;
    }
    const iterations = 1000;
    const headingEl = document.getElementById('draw-histogram-heading');
    const explanationEl = document.getElementById('draw-histogram-explanation');
    const hist = simulateDrawCounts(cards, selectedCategory, handSize, iterations);
    if (headingEl) headingEl.textContent = `Distribution (${iterations} tirages) — Catégorie : ${selectedCategory}`;
    if (explanationEl) {
        explanationEl.style.display = 'block';
        explanationEl.textContent = `En abscisse : nombre de cartes « ${selectedCategory} » en main (0, 1, 2, …). Hauteur des barres : nombre de simulations sur ${iterations} ayant ce résultat.`;
    }
    updateHistogramDOM(hist, iterations, selectedCategory);

    const allTitleEl = document.getElementById('draw-histogram-all-title');
    const allContainer = document.getElementById('draw-histogram-all-categories');
    if (allTitleEl) {
        allTitleEl.style.display = 'block';
        allTitleEl.textContent = `Toutes les catégories (${iterations} tirages chacune)`;
    }
    if (allContainer) {
        allContainer.innerHTML = '';
        categories.forEach((cat, i) => {
            const h = simulateDrawCounts(cards, cat, handSize, iterations);
            renderMiniHistogram(allContainer, cat, h, iterations, i);
        });
    }
}
