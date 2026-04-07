/**
 * Panneau d’aperçu carte sous la recherche du builder (survol des résultats).
 */
import { getSubtypeLine } from './services/search/searchCardPresentation.js';
import type { SearchApiCard } from './services/search/searchApiTypes.js';
import { cardTypeKindFromTypeString } from './utils/cardTypeKind.js';
import { CARD_TYPE_KIND_MONSTER } from './utils/cardTypeKindConstants.js';
import { escapeAttr, escapeHtml } from './utils/html.js';
import { IMG_LOADING_ATTR, IMG_LOADING_LAZY } from './utils/htmlAttrs.js';

export const SEARCH_CARD_PREVIEW_PLACEHOLDER_TEXT =
    'Survolez un résultat pour afficher le nom, les stats et le texte de la carte.';

export const SEARCH_CARD_PREVIEW_NO_DESC_TEXT = 'Texte non disponible';

const DATA_SEARCH_PREVIEW_DESC = 'data-search-preview-desc';

function formatAtkDefLine(card: SearchApiCard): string | null {
    const kind = cardTypeKindFromTypeString(card.type);
    if (kind !== CARD_TYPE_KIND_MONSTER) return null;
    const atk = card.atk;
    const def = card.def;
    if (atk == null && def == null) return null;
    const atkStr = atk != null ? String(atk) : '?';
    const defStr = def != null ? String(def) : '?';
    return `ATK/${atkStr} DEF/${defStr}`;
}

function buildMetaLine(card: SearchApiCard): string {
    const parts: string[] = [];
    const sub = getSubtypeLine(card);
    if (sub) parts.push(sub);
    const arch =
        typeof card.archetype === 'string' && card.archetype.trim() ? card.archetype.trim() : '';
    if (arch) parts.push(arch);
    const atkDef = formatAtkDefLine(card);
    if (atkDef) parts.push(atkDef);
    const ban = typeof card.ban_tcg === 'string' && card.ban_tcg.trim() ? card.ban_tcg.trim() : '';
    if (ban) parts.push(ban);
    return parts.join(' · ');
}

/** Résumé court pour `aria-live` (évite de lire tout le descriptif). */
export function buildSearchCardPreviewLiveText(card: SearchApiCard): string {
    const mainName = (card.name ?? card.name_en ?? '').trim() || 'Carte';
    const typePart = (card.type ?? '').trim();
    return typePart ? `${mainName} — ${typePart}` : mainName;
}

/** HTML du corps d’aperçu (hors texte d’effet : rempli en `textContent` après coup). */
export function buildSearchCardPreviewInnerHtml(card: SearchApiCard): string {
    const mainName = (card.name ?? card.name_en ?? '').trim() || '—';
    const nameEnRaw = typeof card.name_en === 'string' ? card.name_en.trim() : '';
    const namePrimary = (card.name ?? '').trim();
    const showEn = Boolean(nameEnRaw && nameEnRaw !== namePrimary);

    const imgUrl =
        typeof card.image_url === 'string' && card.image_url.trim() ? card.image_url.trim() : '';
    const art = imgUrl
        ? `<img class="search-card-preview__img" src="${escapeAttr(imgUrl)}" alt="" ${IMG_LOADING_ATTR}="${IMG_LOADING_LAZY}" />`
        : `<div class="search-card-preview__img-placeholder" aria-hidden="true"></div>`;

    const metaLine = buildMetaLine(card);
    const metaBlock = metaLine
        ? `<p class="search-card-preview__meta">${escapeHtml(metaLine)}</p>`
        : '';

    const nameEnBlock = showEn
        ? `<p class="search-card-preview__name-en">${escapeHtml(nameEnRaw)}</p>`
        : '';

    return `
        <div class="search-card-preview__layout">
            <div class="search-card-preview__art">${art}</div>
            <div class="search-card-preview__main">
                <h3 class="search-card-preview__name">${escapeHtml(mainName)}</h3>
                ${nameEnBlock}
                ${metaBlock}
                <p class="search-card-preview__desc" ${DATA_SEARCH_PREVIEW_DESC}=""></p>
            </div>
        </div>
    `;
}

export function applySearchCardPreviewPlaceholder(innerEl: HTMLElement): void {
    innerEl.innerHTML = `<p class="search-card-preview__placeholder">${escapeHtml(
        SEARCH_CARD_PREVIEW_PLACEHOLDER_TEXT,
    )}</p>`;
}

export function applySearchCardPreviewCard(innerEl: HTMLElement, card: SearchApiCard): void {
    innerEl.innerHTML = buildSearchCardPreviewInnerHtml(card);
    const descHost = innerEl.querySelector(`[${DATA_SEARCH_PREVIEW_DESC}]`);
    if (descHost) {
        const raw = card.desc;
        const text = typeof raw === 'string' && raw.trim() ? raw.trim() : SEARCH_CARD_PREVIEW_NO_DESC_TEXT;
        descHost.textContent = text;
    }
}

export function setSearchCardPreviewRootVisible(root: HTMLElement | null, visible: boolean): void {
    if (!root) return;
    if (visible) root.removeAttribute('hidden');
    else root.setAttribute('hidden', '');
}

export function resetSearchCardPreview(
    root: HTMLElement | null,
    liveEl: HTMLElement | null,
    innerEl: HTMLElement | null,
): void {
    setSearchCardPreviewRootVisible(root, false);
    if (liveEl) liveEl.textContent = '';
    if (innerEl) innerEl.innerHTML = '';
}
