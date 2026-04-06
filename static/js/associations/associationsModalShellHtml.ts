/**
 * HTML statique de la coquille du modal « cartes associées » (backdrop + panel + header + loading + body).
 */

import { ARIA_ATOMIC_ATTR, ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR, ARIA_LIVE_ATTR } from '../utils/ariaAttrs.js';
import {
    BTN_TYPE_ATTR,
    BTN_TYPE_BUTTON,
    ROLE_ATTR,
    ROLE_DOCUMENT,
} from '../utils/htmlAttrs.js';
import { TEXT_MULTIPLICATION_SIGN } from '../utils/textPlaceholders.js';
import {
    ASSOCIATIONS_MODAL_ANCHOR_ART_CLASS,
    ASSOCIATIONS_MODAL_BACKDROP_CLASS,
    ASSOCIATIONS_MODAL_BODY_CLASS,
    ASSOCIATIONS_MODAL_CLOSE_BTN_ARIA_LABEL,
    ASSOCIATIONS_MODAL_CLOSE_BTN_CLASS,
    ASSOCIATIONS_MODAL_HEADER_CLASS,
    ASSOCIATIONS_MODAL_HEADER_MAIN_CLASS,
    ASSOCIATIONS_MODAL_HEADER_TEXT_CLASS,
    ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT,
    ASSOCIATIONS_MODAL_LIVE_CLASS,
    ASSOCIATIONS_MODAL_LOADING_CLASS,
    ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT,
    ASSOCIATIONS_MODAL_PANEL_CLASS,
    ASSOCIATIONS_MODAL_SPINNER_CLASS,
    ASSOCIATIONS_MODAL_SUBTITLE_CLASS,
    ASSOCIATIONS_MODAL_TITLE_CLASS,
    DATA_ASSOCIATIONS_CLOSE_ATTR,
} from './associationsDomSelectors.js';

export type AssociationsModalShellIds = {
    panelId: string;
    liveId: string;
    loadingId: string;
    bodyId: string;
    titleId: string;
    subtitleId: string;
    anchorArtId: string;
};

export function associationsModalShellInnerHtml(ids: AssociationsModalShellIds): string {
    const {
        panelId,
        liveId,
        loadingId,
        bodyId,
        titleId,
        subtitleId,
        anchorArtId,
    } = ids;
    return `
            <div class="${ASSOCIATIONS_MODAL_BACKDROP_CLASS}" ${DATA_ASSOCIATIONS_CLOSE_ATTR}="1"></div>
            <div class="${ASSOCIATIONS_MODAL_PANEL_CLASS}" id="${panelId}" ${ROLE_ATTR}="${ROLE_DOCUMENT}">
                <div id="${liveId}" class="${ASSOCIATIONS_MODAL_LIVE_CLASS}" ${ARIA_LIVE_ATTR}="polite" ${ARIA_ATOMIC_ATTR}="true"></div>
                <header class="${ASSOCIATIONS_MODAL_HEADER_CLASS}">
                    <div class="${ASSOCIATIONS_MODAL_HEADER_MAIN_CLASS}">
                        <div class="${ASSOCIATIONS_MODAL_ANCHOR_ART_CLASS}" id="${anchorArtId}" ${ARIA_HIDDEN_ATTR}="true"></div>
                        <div class="${ASSOCIATIONS_MODAL_HEADER_TEXT_CLASS}">
                            <h2 id="${titleId}" class="${ASSOCIATIONS_MODAL_TITLE_CLASS}">${ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT}</h2>
                            <p id="${subtitleId}" class="${ASSOCIATIONS_MODAL_SUBTITLE_CLASS}"></p>
                        </div>
                    </div>
                    <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${ASSOCIATIONS_MODAL_CLOSE_BTN_CLASS}" ${DATA_ASSOCIATIONS_CLOSE_ATTR}="1" ${ARIA_LABEL_ATTR}="${ASSOCIATIONS_MODAL_CLOSE_BTN_ARIA_LABEL}">${TEXT_MULTIPLICATION_SIGN}</button>
                </header>
                <div id="${loadingId}" class="${ASSOCIATIONS_MODAL_LOADING_CLASS}" hidden>
                    <span class="${ASSOCIATIONS_MODAL_SPINNER_CLASS}" ${ARIA_HIDDEN_ATTR}="true"></span>
                    <span>${ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT}</span>
                </div>
                <div id="${bodyId}" class="${ASSOCIATIONS_MODAL_BODY_CLASS}"></div>
            </div>
        `;
}
