/**
 * Libellés UI — répartition Main (composition breakdown).
 */

/** Liste de détail vide (sous-groupe sans entrées positives). */
export const COMPOSITION_BREAKDOWN_DETAIL_EMPTY_LIST = 'Aucun détail';

/** Panneau monstres : aucune donnée agrégée. */
export const COMPOSITION_BREAKDOWN_EMPTY_MONSTERS_MAIN = 'Aucun monstre dans le Main';

export const COMPOSITION_BREAKDOWN_EMPTY_SPELLS_MAIN = 'Aucune magie dans le Main';

export const COMPOSITION_BREAKDOWN_EMPTY_TRAPS_MAIN = 'Aucun piège dans le Main';

export const COMPOSITION_BREAKDOWN_GROUP_TITLE_ATTRIBUTE = 'Attribut';

export const COMPOSITION_BREAKDOWN_GROUP_TITLE_LEVEL_RANK = 'Niveau / Rang';

export const COMPOSITION_BREAKDOWN_GROUP_TITLE_RACE = 'Type (race)';

/** Magies / pièges : sous-type (champ race API). */
export const COMPOSITION_BREAKDOWN_GROUP_TITLE_SUBTYPE = 'Sous-type';

const COMPOSITION_BREAKDOWN_LEVEL_LABEL_PREFIX = 'Niveau';

/** Clé de bucket niveau (alignée sur `computeCompositionBreakdown`). */
export function compositionBreakdownLevelBucketKey(level: number): string {
    return `${COMPOSITION_BREAKDOWN_LEVEL_LABEL_PREFIX} ${level}`;
}
