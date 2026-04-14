/** Passcode carte : nombre ou chaîne numérique (ex. JSON / API). */
export function coercePositivePasscode(v: unknown): number | undefined {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.trunc(v);
    if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
        const n = parseInt(v.trim(), 10);
        if (n > 0) return n;
    }
    return undefined;
}
