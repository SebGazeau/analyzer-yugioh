/**
 * DOM du panneau « simulation de tirage » (liste + compteur + bouton).
 */

import { IMG_LOADING_LAZY } from '../utils/htmlAttrs.js';
import {
    DRAW_SIMULATION_COUNT_ID,
    DRAW_SIMULATION_LIST_ID,
    DRAW_SIMULATION_MAX_ID,
    DRAW_SIM_BTN_DRAW_ONE_ID,
} from './drawSimulationDomIds.js';
import {
    DRAW_SIMULATION_EMPTY_CLASS,
    DRAW_SIMULATION_THUMB_CLASS,
    DRAW_SIMULATION_THUMB_PLACEHOLDER_CLASS,
    DRAW_SIMULATION_THUMB_REVEAL_CLASS,
} from './drawSimulationDomSelectors.js';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';
import type { YgoHandDrawCount } from './yugiohDrawConstants.js';

export interface DrawSimulationDomInput {
    drawnCardNames: readonly string[];
    handSize: YgoHandDrawCount;
    resolveImageUrl: (cardName: string) => string | null;
    /** Somme des qty du Main (cartes physiques dans le deck). */
    totalMainDeckCards: number;
}

export function refreshDrawSimulationPanel(input: DrawSimulationDomInput): void {
    const { drawnCardNames, handSize, resolveImageUrl, totalMainDeckCards } = input;
    const container = document.getElementById(DRAW_SIMULATION_LIST_ID);
    const countEl = document.getElementById(DRAW_SIMULATION_COUNT_ID);
    const btnDraw = document.getElementById(DRAW_SIM_BTN_DRAW_ONE_ID) as HTMLButtonElement | null;

    if (countEl) countEl.textContent = String(drawnCardNames.length);
    const maxEl = document.getElementById(DRAW_SIMULATION_MAX_ID);
    if (maxEl) maxEl.textContent = String(handSize);

    if (container) {
        container.textContent = '';
        if (drawnCardNames.length === 0) {
            const empty = document.createElement('span');
            empty.className = DRAW_SIMULATION_EMPTY_CLASS;
            empty.textContent = TEXT_EM_DASH;
            container.appendChild(empty);
        } else {
            for (const name of drawnCardNames) {
                const url = resolveImageUrl(name);
                if (url) {
                    const img = document.createElement('img');
                    img.className = DRAW_SIMULATION_THUMB_CLASS;
                    img.src = url;
                    img.alt = name;
                    img.loading = IMG_LOADING_LAZY;
                    img.title = name;
                    container.appendChild(img);
                } else {
                    const span = document.createElement('span');
                    span.className = DRAW_SIMULATION_THUMB_PLACEHOLDER_CLASS;
                    span.textContent = name;
                    span.title = name;
                    container.appendChild(span);
                }
            }
            const lastChild = container.lastElementChild;
            if (lastChild) lastChild.classList.add(DRAW_SIMULATION_THUMB_REVEAL_CLASS);
        }
    }

    if (btnDraw) {
        const remaining = totalMainDeckCards - drawnCardNames.length;
        btnDraw.disabled = drawnCardNames.length >= handSize || remaining <= 0;
    }
}
