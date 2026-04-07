/**
 * Longueurs CSS pour assignation à `element.style.*` ou attributs `style="…"` inline.
 */

export function cssLengthPx(px: number): string {
    return `${px}px`;
}

export function cssLengthPercent(pct: number): string {
    return `${pct}%`;
}
