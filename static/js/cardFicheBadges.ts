/**
 * Badges stats (niveau, attribut, ATK/DEF) pour présentation type « fiche carte ».
 */
import { cardTypeKindFromTypeString } from './utils/cardTypeKind.js';
import { CARD_TYPE_KIND_MONSTER } from './utils/cardTypeKindConstants.js';
import { escapeHtml } from './utils/html.js';

/** Classe partagée popover + aperçu recherche (styles dans dashboard.css). */
export const CARD_FICHE_BADGE_CLASS = 'card-fiche-badge';
export const CARD_FICHE_BADGE_STAT_MODIFIER = 'card-fiche-badge--stat';

export type CardFicheBadgeSource = {
    type?: string;
    level?: number;
    attribute?: string;
    atk?: number | null;
    def?: number | null;
};

export function buildCardFicheBadgesInnerHtml(src: CardFicheBadgeSource): string {
    const kind = cardTypeKindFromTypeString(src.type);
    if (kind !== CARD_TYPE_KIND_MONSTER) return '';
    const parts: string[] = [];
    if (src.level != null) {
        parts.push(
            `<span class="${CARD_FICHE_BADGE_CLASS}">${escapeHtml(`Niveau ${src.level}`)}</span>`,
        );
    }
    const attr = typeof src.attribute === 'string' && src.attribute.trim() ? src.attribute.trim() : '';
    if (attr) {
        parts.push(`<span class="${CARD_FICHE_BADGE_CLASS}">${escapeHtml(attr)}</span>`);
    }
    if (src.atk != null || src.def != null) {
        const a = src.atk != null ? String(src.atk) : '?';
        const d = src.def != null ? String(src.def) : '?';
        parts.push(
            `<span class="${CARD_FICHE_BADGE_CLASS} ${CARD_FICHE_BADGE_STAT_MODIFIER}">${escapeHtml(`${a} / ${d}`)}</span>`,
        );
    }
    return parts.join('');
}
