/**
 * Correspondance de motifs dans les textes « citables » (descriptions / effets EN).
 */

import type { AssociationCatalogCard } from '../../associations/types.js';

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Correspondance pour une sous-chaîne : `includes` ou mot entier ASCII (évite les sous-mots).
 * Espaces / tirets dans le motif → toujours `includes` (phrases, « blue-eyes », etc.).
 */
export function patternMatchesInCitableText(haystackLower: string, patternRaw: string, useWordBoundary: boolean): boolean {
    const p = patternRaw.toLowerCase();
    if (!p) return false;
    if (!useWordBoundary) return haystackLower.includes(p);
    if (/\s/.test(p) || p.includes('-')) return haystackLower.includes(p);
    if (p.length < 2 || /[^a-z0-9]/.test(p)) return haystackLower.includes(p);
    const re = new RegExp(`(?<![a-z0-9])${escapeRegex(p)}(?![a-z0-9])`);
    return re.test(haystackLower);
}

/**
 * Texte balayé pour les angles « citation » :
 * `desc` YGOProDeck puis blocs EN YGOrg (effet, pendule, flavor, nom officiel).
 */
export function associationCitableText(c: AssociationCatalogCard): string {
    const parts = [
        c.desc,
        c.ygorg_effect_en,
        c.ygorg_pendulum_effect_en,
        c.ygorg_flavor_en,
        c.ygorg_link_effect_en,
        c.ygorg_name_en,
    ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    return parts.join('\n\n');
}

/**
 * Même chose sans le nom officiel YGOrg : évite les faux positifs « texte cite l’ancre »
 * quand seul `ygorg_name_en` dupliquerait le titre de la carte.
 */
export function associationCitableTextForAnchorNameMatch(c: AssociationCatalogCard): string {
    const parts = [
        c.desc,
        c.ygorg_effect_en,
        c.ygorg_pendulum_effect_en,
        c.ygorg_flavor_en,
        c.ygorg_link_effect_en,
    ].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    return parts.join('\n\n');
}

export function collapseWhitespaceLower(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeAnchorNameForDescMatch(name: string): string {
    return collapseWhitespaceLower(name).replace(/["'’]/g, '');
}
