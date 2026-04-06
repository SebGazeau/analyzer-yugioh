/**
 * Branchement simulation de tirage : hand size (5/6), tirer une carte, reset, run 1000 sims.
 */
import {
    DRAW_SIM_BTN_CLEAR_HISTOGRAMS_ID,
    DRAW_SIM_BTN_DRAW_ONE_ID,
    DRAW_SIM_BTN_DRAW_RESET_ID,
    DRAW_SIM_BTN_HAND_5_ID,
    DRAW_SIM_BTN_HAND_6_ID,
    DRAW_SIM_BTN_RUN_1000_ID,
    DRAW_SIM_HAND_BTN_ACTIVE_CLASS,
    DRAW_SIM_HAND_DATA_ATTR,
    DRAW_SIM_HAND_SIZE_BTN_CLASS,
} from '../analysis/drawSimulationDomIds.js';
import { YGO_FIRST_HAND_DRAW_COUNT, YGO_SECOND_HAND_DRAW_COUNT } from '../analysis/yugiohDrawConstants.js';
import { DOM_EVENT_CLICK } from '../utils/domEventNames.js';
import { setHandSize, getHandSize, drawOneCard, resetDrawSimulation, runSimulation1000AndUpdateHistogram, clearHistogramGraphs } from '../stats.js';

export function bindSimulation(): void {
    function updateHandSizeButtons(): void {
        const current = getHandSize();
        document.querySelectorAll(`.${DRAW_SIM_HAND_SIZE_BTN_CLASS}`).forEach((btn) => {
            const b = btn as HTMLButtonElement;
            b.classList.toggle(
                DRAW_SIM_HAND_BTN_ACTIVE_CLASS,
                parseInt(b.getAttribute(DRAW_SIM_HAND_DATA_ATTR) || String(YGO_FIRST_HAND_DRAW_COUNT), 10) === current,
            );
        });
    }

    document.getElementById(DRAW_SIM_BTN_HAND_5_ID)?.addEventListener(DOM_EVENT_CLICK, () => {
        setHandSize(YGO_FIRST_HAND_DRAW_COUNT);
        updateHandSizeButtons();
    });
    document.getElementById(DRAW_SIM_BTN_HAND_6_ID)?.addEventListener(DOM_EVENT_CLICK, () => {
        setHandSize(YGO_SECOND_HAND_DRAW_COUNT);
        updateHandSizeButtons();
    });
    updateHandSizeButtons();

    document.getElementById(DRAW_SIM_BTN_DRAW_ONE_ID)?.addEventListener(DOM_EVENT_CLICK, () => { drawOneCard(); });
    document.getElementById(DRAW_SIM_BTN_DRAW_RESET_ID)?.addEventListener(DOM_EVENT_CLICK, () => { resetDrawSimulation(); });
    document.getElementById(DRAW_SIM_BTN_RUN_1000_ID)?.addEventListener(DOM_EVENT_CLICK, () => { runSimulation1000AndUpdateHistogram(); });
    document.getElementById(DRAW_SIM_BTN_CLEAR_HISTOGRAMS_ID)?.addEventListener(DOM_EVENT_CLICK, () => { clearHistogramGraphs(); });
}
