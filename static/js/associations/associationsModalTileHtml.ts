/**
 * HTML des vignettes / tuiles du modal associations (aperçu carte, liste groupe).
 */

import { ARIA_HIDDEN_ATTR } from '../utils/ariaAttrs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import {
    IMG_DECODING_ASYNC,
    IMG_DECODING_ATTR,
    IMG_LOADING_ATTR,
    ROLE_ATTR,
    ROLE_BUTTON,
    TABINDEX_ATTR,
    TABINDEX_ZERO,
    TITLE_ATTR,
} from '../utils/htmlAttrs.js';
import {
    ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS,
    ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE,
    ASSOCIATIONS_MODAL_TILE_ART_CLASS,
    ASSOCIATIONS_MODAL_TILE_CAPTION_CLASS,
    ASSOCIATIONS_MODAL_TILE_CLASS,
    ASSOCIATIONS_MODAL_TILE_IMG_CLASS,
    ASSOCIATIONS_MODAL_TILE_NAME_CLASS,
    DATA_ASSOCIATIONS_ADD_DECK_ATTR,
    DATA_CARD_ID_ATTR,
} from './associationsDomSelectors.js';
import type { AssociationCatalogCard } from './types.js';

const ASSOCIATIONS_MODAL_THUMB_IMG_WIDTH = 59;
const ASSOCIATIONS_MODAL_THUMB_IMG_HEIGHT = 86;

function isAllowedImageSrc(url: string): boolean {
    const t = url.trim();
    return t.startsWith('/') || t.startsWith('https://') || t.startsWith('http://');
}

/** Fragment visuel : image autorisée ou initiales (placeholder). */
export function associationsModalThumbInnerHtml(
    imageUrl: string | null | undefined,
    name: string,
    imgClass: string,
    loading: 'eager' | 'lazy',
): string {
    const safeName = escapeHtml(name);
    if (imageUrl && isAllowedImageSrc(imageUrl)) {
        return `<img class="${imgClass}" src="${escapeAttr(imageUrl)}" alt="${safeName}" width="${ASSOCIATIONS_MODAL_THUMB_IMG_WIDTH}" height="${ASSOCIATIONS_MODAL_THUMB_IMG_HEIGHT}" ${IMG_LOADING_ATTR}="${loading}" ${IMG_DECODING_ATTR}="${IMG_DECODING_ASYNC}" />`;
    }
    const initials =
        name
            .replace(/[^a-zA-ZÀ-ÿ0-9]/g, '')
            .slice(0, 2)
            .toUpperCase() || '?';
    return `<div class="${ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS}" ${ARIA_HIDDEN_ATTR}="true"><span>${escapeHtml(initials)}</span></div>`;
}

/** `<li>` tuile catalogue (ajout deck). */
export function associationsModalTileListItemHtml(
    id: number,
    idToCard: Map<number, AssociationCatalogCard>,
): string {
    const row = idToCard.get(id);
    const nm = row ? row.name_en?.trim() || row.name : `#${id}`;
    const art = associationsModalThumbInnerHtml(row?.image_url, nm, ASSOCIATIONS_MODAL_TILE_IMG_CLASS, 'lazy');
    return `<li class="${ASSOCIATIONS_MODAL_TILE_CLASS}" ${DATA_CARD_ID_ATTR}="${id}" ${DATA_ASSOCIATIONS_ADD_DECK_ATTR}="1" ${ROLE_ATTR}="${ROLE_BUTTON}" ${TABINDEX_ATTR}="${TABINDEX_ZERO}" ${TITLE_ATTR}="${ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE}"><div class="${ASSOCIATIONS_MODAL_TILE_ART_CLASS}">${art}</div><div class="${ASSOCIATIONS_MODAL_TILE_CAPTION_CLASS}"><span class="${ASSOCIATIONS_MODAL_TILE_NAME_CLASS}">${escapeHtml(nm)}</span></div></li>`;
}
