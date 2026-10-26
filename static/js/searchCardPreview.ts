/**
 * Corps HTML de l’aperçu carte (recherche builder) : utilisé dans le flottant `search-card-float`.
 * Présentation type « fiche » : informatif uniquement, sans actions.
 */
import { buildCardFicheBadgesInnerHtml } from './cardFicheBadges.js';
import { buildCardArtBannerHtml, cardArtBannerFrameHintFromType } from './components/cardArtBanner.js';
import type { SearchApiCard } from './services/search/searchApiTypes.js';
import { cardTypeKindFromTypeString } from './utils/cardTypeKind.js';
import { CARD_TYPE_KIND_MONSTER } from './utils/cardTypeKindConstants.js';
import { escapeHtml } from './utils/html.js';

export const SEARCH_CARD_PREVIEW_PLACEHOLDER_TEXT =
    'Survolez un résultat pour afficher le nom, les stats et le texte de la carte.';

export const SEARCH_CARD_PREVIEW_NO_DESC_TEXT = 'Texte non disponible';

const DATA_SEARCH_PREVIEW_DESC = 'data-search-preview-desc';

function typePrimarySecondary(card: SearchApiCard): { primary: string; secondary: string } {
    const primary = (card.type ?? '').trim();
    const kind = cardTypeKindFromTypeString(card.type);
    if (kind === CARD_TYPE_KIND_MONSTER) {
        return { primary, secondary: (card.race ?? '').trim() };
    }
    return { primary, secondary: '' };
}

function attributeString(card: SearchApiCard): string | undefined {
    const a = card.attribute;
    return typeof a === 'string' && a.trim() ? a.trim() : undefined;
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
    const bannerHtml = buildCardArtBannerHtml(imgUrl, {
        alt: mainName,
        loading: 'lazy',
        variant: 'compact',
        frameHint: cardArtBannerFrameHintFromType(card.type),
        rootClassExtra: 'search-card-preview__art-banner',
    });

    const { primary: typePri, secondary: typeSec } = typePrimarySecondary(card);
    const typePriBlock = typePri
        ? `<p class="search-card-preview__type-primary">${escapeHtml(typePri)}</p>`
        : '';
    const typeSecBlock = typeSec
        ? `<p class="search-card-preview__type-secondary">${escapeHtml(typeSec)}</p>`
        : '';

    const arch =
        typeof card.archetype === 'string' && card.archetype.trim() ? card.archetype.trim() : '';
    const ban = typeof card.ban_tcg === 'string' && card.ban_tcg.trim() ? card.ban_tcg.trim() : '';
    const metaBits: string[] = [];
    if (arch) metaBits.push(arch);
    if (ban) metaBits.push(ban);
    const metaExtra =
        metaBits.length > 0
            ? `<p class="search-card-preview__meta-extra">${escapeHtml(metaBits.join(' · '))}</p>`
            : '';

    const badgesInner = buildCardFicheBadgesInnerHtml({
        type: card.type,
        level: card.level ?? undefined,
        attribute: attributeString(card),
        atk: card.atk ?? null,
        def: card.def ?? null,
    });
    const badgesRow = badgesInner
        ? `<div class="search-card-preview__badge-row">${badgesInner}</div>`
        : '';

    const nameEnBlock = showEn
        ? `<p class="search-card-preview__name-en">${escapeHtml(nameEnRaw)}</p>`
        : '';

    return `
        <div class="search-card-preview__layout search-card-preview__layout--fiche">
            ${bannerHtml}
            <div class="search-card-preview__fiche-body">
                <h3 class="search-card-preview__name">${escapeHtml(mainName)}</h3>
                ${nameEnBlock}
                ${typePriBlock}
                ${typeSecBlock}
                ${badgesRow}
                ${metaExtra}
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
