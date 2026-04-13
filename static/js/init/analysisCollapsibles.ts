/**
 * Replis du tableau Analysis (Engines / Catégories / Groupes).
 * Séparé des replis du deck Builder pour regrouper l’init sous initAnalysis.
 */
import { ARIA_EXPANDED_ATTR } from '../utils/ariaAttrs.js';
import { DOM_EVENT_CLICK } from '../utils/domEventNames.js';
import {
    analysisTableSectionCollapsedClass,
    ANALYSIS_SECTION_HEADER_ROW_SELECTOR,
    ANALYSIS_SECTION_HEADER_TOGGLE_SELECTOR,
    ANALYSIS_TABLE_SELECTOR,
    DATA_SECTION_HEADER_ATTR,
} from '../analysis/analysisTableDomSelectors.js';
import {
    COLLAPSIBLE_ANALYSIS_TOGGLE_COLLAPSED,
    COLLAPSIBLE_ANALYSIS_TOGGLE_EXPANDED,
} from './collapsibleToggleCopy.js';

export function bindAnalysisTableCollapsibles(): void {
    const analysisTable = document.querySelector(ANALYSIS_TABLE_SELECTOR);
    analysisTable?.addEventListener(DOM_EVENT_CLICK, (e: Event) => {
        const target = (e.target as HTMLElement).closest(ANALYSIS_SECTION_HEADER_ROW_SELECTOR);
        if (!target) return;
        const id = target.getAttribute(DATA_SECTION_HEADER_ATTR);
        if (!id) return;
        const table = (target as HTMLElement).closest(ANALYSIS_TABLE_SELECTOR);
        if (!table) return;
        const collapsed = table.classList.toggle(analysisTableSectionCollapsedClass(id));
        target.setAttribute(ARIA_EXPANDED_ATTR, String(!collapsed));
        const toggle = target.querySelector(ANALYSIS_SECTION_HEADER_TOGGLE_SELECTOR);
        if (toggle) {
            toggle.textContent = collapsed ? COLLAPSIBLE_ANALYSIS_TOGGLE_COLLAPSED : COLLAPSIBLE_ANALYSIS_TOGGLE_EXPANDED;
        }
    });
}
