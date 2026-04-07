/**
 * Fragments HTML d’une ligne de résultat recherche (builder).
 */

import { archetypeSourceUi } from './associations/archetypeSourceUi.js';
import {
    DATA_SEARCH_ACTION_ATTR,
    DATA_SEARCH_ARCHETYPE_SOURCE_ATTR,
    SEARCH_ACTION_ASSOCIATED,
    SEARCH_RESULT_ACTIONS_CLASS,
    SEARCH_RESULT_ADD_DECK_CLASS,
    SEARCH_RESULT_ADD_SIDE_CLASS,
    SEARCH_RESULT_ARCH_SOURCE_CLASS,
    SEARCH_RESULT_ASSOCIATED_CLASS,
    SEARCH_RESULT_INFO_CLASS,
    SEARCH_RESULT_META_CLASS,
    SEARCH_RESULT_NAME_CLASS,
    SEARCH_RESULT_SUBTYPE_CLASS,
    SEARCH_RESULT_THUMB_CLASS,
    SEARCH_RESULT_THUMB_IMG_CLASS,
    SEARCH_RESULT_BTN_ADD_DECK_ARIA_LABEL,
    SEARCH_RESULT_BTN_ADD_DECK_CAPTION,
    SEARCH_RESULT_BTN_ADD_DECK_TITLE,
    SEARCH_RESULT_BTN_ADD_SIDE_ARIA_LABEL,
    SEARCH_RESULT_BTN_ADD_SIDE_CAPTION,
    SEARCH_RESULT_BTN_ADD_SIDE_TITLE,
    SEARCH_RESULT_BTN_ASSOCIATED_ARIA_LABEL,
    SEARCH_RESULT_BTN_ASSOCIATED_CAPTION,
    SEARCH_RESULT_BTN_ASSOCIATED_TITLE,
    searchResultInitialCellClass,
} from './searchDomSelectors.js';
import {
    SEARCH_RESULT_THUMB_LETTER_MONSTER,
    SEARCH_RESULT_THUMB_LETTER_SPELL,
    SEARCH_RESULT_THUMB_LETTER_TRAP,
} from './searchResultThumbCopy.js';
import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from './utils/ariaAttrs.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON, IMG_LOADING_ATTR, IMG_LOADING_LAZY, TITLE_ATTR } from './utils/htmlAttrs.js';
import { escapeAttr, escapeHtml } from './utils/html.js';
import {
    CARD_TYPE_KIND_MONSTER,
    CARD_TYPE_KIND_SPELL,
    type CardTypeKind,
} from './utils/cardTypeKindConstants.js';

/** Alias sémantique : vignette M/S/T (pas de filtre « tous »). */
export type SearchResultRowKind = CardTypeKind;

/** Badge provenance archétype (vide si pas de source affichable). */
export function searchResultArchetypeSourceBadgeHtml(archetypeSource: unknown): string {
    if (typeof archetypeSource !== 'string' || !archetypeSource.trim()) return '';
    const src = archetypeSource.trim();
    const { short, title } = archetypeSourceUi(src);
    if (!short) return '';
    return `<span class="${SEARCH_RESULT_ARCH_SOURCE_CLASS}" ${DATA_SEARCH_ARCHETYPE_SOURCE_ATTR}="${escapeAttr(src)}" title="${escapeAttr(title)}">${escapeHtml(short)}</span>`;
}

/** Contenu de la vignette : image lazy ou initiale M/S/T. */
export function searchResultThumbInnerHtml(imageUrl: unknown, kind: SearchResultRowKind): string {
    const imgUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : '';
    if (imgUrl) {
        return `<img class="${SEARCH_RESULT_THUMB_IMG_CLASS}" src="${escapeAttr(imgUrl)}" alt="" ${IMG_LOADING_ATTR}="${IMG_LOADING_LAZY}" />`;
    }
    const letter =
        kind === CARD_TYPE_KIND_MONSTER
            ? SEARCH_RESULT_THUMB_LETTER_MONSTER
            : kind === CARD_TYPE_KIND_SPELL
              ? SEARCH_RESULT_THUMB_LETTER_SPELL
              : SEARCH_RESULT_THUMB_LETTER_TRAP;
    return `<span class="${searchResultInitialCellClass(kind)}" ${ARIA_HIDDEN_ATTR}="true">${letter}</span>`;
}

export type SearchResultRowFragmentParams = {
    /** Nom avec surlignage éventuel (déjà du HTML sûr côté injection). */
    nameHighlightedHtml: string;
    subtypeEscapedHtml: string;
    archetypeBadgeHtml: string;
    thumbInnerHtml: string;
};

/** HTML interne de la ligne (sans le conteneur `SEARCH_RESULT_ROW_CLASS`). */
export function searchResultRowFragmentHtml(p: SearchResultRowFragmentParams): string {
    return `
        <div class="${SEARCH_RESULT_THUMB_CLASS}">${p.thumbInnerHtml}</div>
        <div class="${SEARCH_RESULT_INFO_CLASS}">
            <span class="${SEARCH_RESULT_NAME_CLASS}">${p.nameHighlightedHtml}</span>
            <div class="${SEARCH_RESULT_META_CLASS}">
                <span class="${SEARCH_RESULT_SUBTYPE_CLASS}">${p.subtypeEscapedHtml}</span>
                ${p.archetypeBadgeHtml}
            </div>
        </div>
        <div class="${SEARCH_RESULT_ACTIONS_CLASS}">
            <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${SEARCH_RESULT_ADD_DECK_CLASS}" ${TITLE_ATTR}="${SEARCH_RESULT_BTN_ADD_DECK_TITLE}" ${ARIA_LABEL_ATTR}="${SEARCH_RESULT_BTN_ADD_DECK_ARIA_LABEL}">${SEARCH_RESULT_BTN_ADD_DECK_CAPTION}</button>
            <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${SEARCH_RESULT_ADD_SIDE_CLASS}" ${TITLE_ATTR}="${SEARCH_RESULT_BTN_ADD_SIDE_TITLE}" ${ARIA_LABEL_ATTR}="${SEARCH_RESULT_BTN_ADD_SIDE_ARIA_LABEL}">${SEARCH_RESULT_BTN_ADD_SIDE_CAPTION}</button>
            <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${SEARCH_RESULT_ASSOCIATED_CLASS}" ${DATA_SEARCH_ACTION_ATTR}="${SEARCH_ACTION_ASSOCIATED}" ${TITLE_ATTR}="${SEARCH_RESULT_BTN_ASSOCIATED_TITLE}" ${ARIA_LABEL_ATTR}="${SEARCH_RESULT_BTN_ASSOCIATED_ARIA_LABEL}">${SEARCH_RESULT_BTN_ASSOCIATED_CAPTION}</button>
        </div>
    `;
}
