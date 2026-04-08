/**
 * Bannière visuelle : image carte HD recadrée en panoramique + masque dégradé bas.
 * Voir `static/css/components/card-art-banner.css`.
 */
import { escapeAttr } from '../utils/html.js';
import { IMG_LOADING_ATTR, IMG_LOADING_EAGER, IMG_LOADING_LAZY } from '../utils/htmlAttrs.js';

export const CARD_ART_BANNER_CLASS = 'card-art-banner';
export const CARD_ART_BANNER_CLIP_CLASS = 'card-art-banner__clip';
export const CARD_ART_BANNER_IMG_CLASS = 'card-art-banner__img';
export const CARD_ART_BANNER_PLACEHOLDER_CLASS = 'card-art-banner__placeholder';

export type CardArtBannerVariant = 'default' | 'compact' | 'hero';

/** `spell` / `trap` ajustent le point de focus vertical (cadre carte). */
export type CardArtBannerFrameHint = 'monster' | 'spell' | 'trap';

export type BuildCardArtBannerHtmlOptions = {
  alt?: string;
  loading?: 'eager' | 'lazy';
  variant?: CardArtBannerVariant;
  /** Déduit du type de carte quand présent. */
  frameHint?: CardArtBannerFrameHint;
  /** Classes supplémentaires sur le root (espacement, etc.). */
  rootClassExtra?: string;
};

function rootClassList(opts: BuildCardArtBannerHtmlOptions): string {
    const parts = [CARD_ART_BANNER_CLASS];
    if (opts.variant === 'compact') parts.push(`${CARD_ART_BANNER_CLASS}--compact`);
    if (opts.variant === 'hero') parts.push(`${CARD_ART_BANNER_CLASS}--hero`);
    const hint = opts.frameHint;
    if (hint === 'spell') parts.push(`${CARD_ART_BANNER_CLASS}--spell`);
    if (hint === 'trap') parts.push(`${CARD_ART_BANNER_CLASS}--trap`);
    if (opts.rootClassExtra?.trim()) parts.push(opts.rootClassExtra.trim());
    return parts.join(' ');
}

function frameHintFromCardType(typeRaw: string | undefined): CardArtBannerFrameHint | undefined {
    const t = (typeRaw ?? '').toLowerCase();
    if (t.includes('spell')) return 'spell';
    if (t.includes('trap')) return 'trap';
    return 'monster';
}

/**
 * Indice de cadre à partir d’une chaîne `type` API (ex. "Spell Card", "Trap Card", "Effect Monster").
 */
export function cardArtBannerFrameHintFromType(typeRaw: string | undefined): CardArtBannerFrameHint | undefined {
    return frameHintFromCardType(typeRaw);
}

/** HTML du bloc bannière ; `imageUrl` vide → placeholder décoratif. */
export function buildCardArtBannerHtml(imageUrl: string, opts: BuildCardArtBannerHtmlOptions = {}): string {
    const url = imageUrl.trim();
    const alt = (opts.alt ?? '').trim();
    const loading = opts.loading ?? IMG_LOADING_LAZY;
    const rootClasses = rootClassList(opts);

    const inner = url
        ? `<img class="${CARD_ART_BANNER_IMG_CLASS}" src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" ${IMG_LOADING_ATTR}="${loading === 'eager' ? IMG_LOADING_EAGER : IMG_LOADING_LAZY}" />`
        : `<div class="${CARD_ART_BANNER_PLACEHOLDER_CLASS}" aria-hidden="true"></div>`;

    return `<div class="${rootClasses}"><div class="${CARD_ART_BANNER_CLIP_CLASS}">${inner}</div></div>`;
}
