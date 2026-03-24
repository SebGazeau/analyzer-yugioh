/**
 * Parse le champ `archetype` API (une ou plusieurs valeurs séparées).
 * Ex. "Regenesis / Archfiend", "A | B" → ["Regenesis", "Archfiend"].
 */
const SPLIT_RE = /[/|;,]+/;

export function parseArchetypesFromField(archetype: string | null | undefined): string[] {
    if (archetype == null || typeof archetype !== 'string') return [];
    const trimmed = archetype.trim();
    if (!trimmed) return [];
    return trimmed
        .split(SPLIT_RE)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
