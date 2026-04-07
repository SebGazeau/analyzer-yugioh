/**
 * Textes UI de l’insight Seventh Tachyon (titres, aide, résumés).
 */

import {
    TEXT_EN_DASH,
    TEXT_GUILLEMET_CLOSE,
    TEXT_GUILLEMET_OPEN,
} from '../utils/textPlaceholders.js';

export const INSIGHT_SEVENTH_TACHYON_TITLE = 'Seventh Tachyon';

export const INSIGHT_SEVENTH_TACHYON_HELP_LINE =
    'Une activation par tour. Le reste de l’effet (bannissement, dégâts, etc.) n’est pas simulé ici.';

/** Extra sans Number 101–107 : au moins une proposition colle au Main/Side. */
export function insightSeventhTachyonSummaryExtraNoQualifyingWithPrio(prio: number): string {
    return `Extra Deck sans Number 101${TEXT_EN_DASH}107 ni C101${TEXT_EN_DASH}C107. ${prio} proposition(s) ci-dessous correspondent à des monstres dans ton Main ou ton Side (niveau = rang, type ou attribut). Les autres complètent la liste.`;
}

/** Extra sans Number 101–107 : aucune proposition ne colle au Main/Side. */
export function insightSeventhTachyonSummaryExtraNoQualifyingNoPrio(): string {
    return `Extra Deck sans monstre Xyz ${TEXT_GUILLEMET_OPEN} Number ${TEXT_GUILLEMET_CLOSE} 101${TEXT_EN_DASH}107 ou C101${TEXT_EN_DASH}C107. Voici les 14 cartes de la série : privilégie celles dont le rang égale un niveau de monstre dans ton Main/Side et qui partagent type ou attribut.`;
}

export const INSIGHT_SEVENTH_TACHYON_SUMMARY_MAIN_NO_TARGETS =
    'Aucun monstre du Main ne correspond (Type ou Attribut identique au Number révélé, Niveau = Rang).';

export function insightSeventhTachyonSummaryMainWithTargets(uniqueTargetCount: number): string {
    return `${uniqueTargetCount} carte(s) distincte(s) dans le Main peuvent être ajoutées à la main (Type ou Attribut identique, Niveau = Rang).`;
}
