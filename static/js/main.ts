// Point d'entrée du front-end (module ES6)
// Trois interfaces : Decks | Builder | Analysis (data-page="decks"|"builder"|"analysis").
import { addToDeck, cleanCardTable, exportDeckToFile, importDeckFromFile } from './deck.js';
import { updateDeckCount, computeGlobalStats } from './stats.js';
import { initDecks } from './init/decks.js';
import { initBuilder } from './init/builder.js';
import { initAnalysis } from './init/analysis.js';

function getInitials(pseudo: string | null): string {
    if (!pseudo || !pseudo.trim()) return '?';
    const parts = pseudo.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return pseudo.slice(0, 2).toUpperCase().padEnd(2, pseudo[0]);
}

function bindAvatarInitials(): void {
    document.querySelectorAll<HTMLElement>('.header-avatar[data-pseudo]').forEach((el) => {
        el.textContent = getInitials(el.getAttribute('data-pseudo'));
    });
}

const TAB_IDS = ['builder', 'decks', 'analysis'] as const;

function setActiveTab(tabId: string): void {
    document.querySelectorAll('.app-tab').forEach((a) => {
        a.classList.remove('app-tab--active');
        a.setAttribute('aria-selected', 'false');
    });
    const activeTab = document.querySelector(`.app-tab[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('app-tab--active');
        activeTab.setAttribute('aria-selected', 'true');
    }
    TAB_IDS.forEach((id) => {
        const panel = document.getElementById(id);
        if (panel) {
            panel.classList.toggle('tab-panel--active', id === tabId);
        }
    });
}

function bindAppTabs(): void {
    setActiveTab('builder');
    document.querySelectorAll<HTMLAnchorElement>('.app-tab').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = a.getAttribute('data-tab') || '';
            setActiveTab(tabId);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindAvatarInitials();
    bindAppTabs();
    initDecks();
    initBuilder();
    initAnalysis();
});

export { setActiveTab };

// Pour tests unitaires
export { addToDeck, cleanCardTable, exportDeckToFile, importDeckFromFile, updateDeckCount, computeGlobalStats };
