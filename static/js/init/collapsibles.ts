/**
 * Zones repliables : deck (Main/Extra/Side), table Analysis (Engines/Catégories/Groupes).
 */
import {
    analysisTableSectionCollapsedClass,
    ANALYSIS_SECTION_HEADER_ROW_SELECTOR,
    ANALYSIS_SECTION_HEADER_TOGGLE_SELECTOR,
    ANALYSIS_TABLE_SELECTOR,
    DATA_SECTION_HEADER_ATTR,
} from '../analysis/analysisTableDomSelectors.js';
import { DECK_ACTION_TOGGLE_ZONE_SELECTOR } from '../deck-builder/deckConstants.js';
import { DECK_SECTION_COLLAPSED_CLASS, DECK_SECTION_SELECTOR } from '../deck-builder/grid/deckGridDomSelectors.js';

export function bindCollapsibles(): void {
    document.querySelectorAll(DECK_ACTION_TOGGLE_ZONE_SELECTOR).forEach((el) => {
        el.addEventListener('click', () => {
            const section = el.closest(DECK_SECTION_SELECTOR);
            if (!section) return;
            const expanded = section.classList.toggle(DECK_SECTION_COLLAPSED_CLASS);
            (el as HTMLElement).setAttribute('aria-expanded', String(!expanded));
        });
    });

    const analysisTable = document.querySelector(ANALYSIS_TABLE_SELECTOR);
    analysisTable?.addEventListener('click', (e: Event) => {
        const target = (e.target as HTMLElement).closest(ANALYSIS_SECTION_HEADER_ROW_SELECTOR);
        if (!target) return;
        const id = target.getAttribute(DATA_SECTION_HEADER_ATTR);
        if (!id) return;
        const table = (target as HTMLElement).closest(ANALYSIS_TABLE_SELECTOR);
        if (!table) return;
        const collapsed = table.classList.toggle(analysisTableSectionCollapsedClass(id));
        target.setAttribute('aria-expanded', String(!collapsed));
        const toggle = target.querySelector(ANALYSIS_SECTION_HEADER_TOGGLE_SELECTOR);
        if (toggle) toggle.textContent = collapsed ? '▶' : '▼';
    });
}
