/**
 * Zones repliables : deck (Main/Extra/Side). Le tableau Analysis est géré par bindAnalysisTableCollapsibles (initAnalysis).
 */
import { ARIA_EXPANDED_ATTR } from '../utils/ariaAttrs.js';
import { DOM_EVENT_CLICK } from '../utils/domEventNames.js';
import { DECK_ACTION_TOGGLE_ZONE_SELECTOR } from '../deck-builder/deckConstants.js';
import { DECK_SECTION_COLLAPSED_CLASS, DECK_SECTION_SELECTOR } from '../deck-builder/grid/deckGridDomSelectors.js';

export function bindCollapsibles(): void {
    document.querySelectorAll(DECK_ACTION_TOGGLE_ZONE_SELECTOR).forEach((el) => {
        el.addEventListener(DOM_EVENT_CLICK, () => {
            const section = el.closest(DECK_SECTION_SELECTOR);
            if (!section) return;
            const expanded = section.classList.toggle(DECK_SECTION_COLLAPSED_CLASS);
            (el as HTMLElement).setAttribute(ARIA_EXPANDED_ATTR, String(!expanded));
        });
    });
}
