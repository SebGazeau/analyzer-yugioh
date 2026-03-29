/**
 * Libellés UI pour `archetype_source` (réponses `/search`, `/associations/catalog`).
 */

export function archetypeSourceUi(code: string): { short: string; title: string } {
    const c = code.trim();
    if (!c) return { short: '', title: '' };
    if (c === 'ygorg_effect_en') {
        return {
            short: 'YGOrg',
            title:
                "Archétype complété depuis le texte d'effet EN YGResources (heuristique, pas la fiche officielle Konami).",
        };
    }
    return {
        short: c.length > 14 ? `${c.slice(0, 12)}…` : c,
        title: `Provenance métadonnées archétype : ${c}`,
    };
}
