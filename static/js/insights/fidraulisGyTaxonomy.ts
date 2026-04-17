/**
 * Libellés FR par taxon — source unique pour colonne « Contexte » (insight + encart agrégé partiel).
 */
import type { FidraulisGyResourceTaxon } from './types.js';

export const FIDRAULIS_GY_TAXON_LABEL_FR: Record<FidraulisGyResourceTaxon, string> = {
    extra_synchro_to_gy_fid_cost:
        'Coût Fidraulis (palier 4+) : envoyer un Synchro Extra au Cimetière ; ressource une fois au CY.',
    effect_on_sent_to_gy: 'Effet déclenché si / quand cette carte est envoyée au Cimetière.',
    field_or_gy_continuous: 'Effet actif tant que la carte est sur le Terrain ou dans le Cimetière.',
    effect_if_in_gy:
        'Effet activable lorsque cette carte est dans votre Cimetière (PSCT du type « si cette carte est dans votre Cimetière », sans envoi depuis le Terrain).',
    discard_cost: 'Coût ou effet impliquant une défausse (détection approximative sur le texte).',
    other_documented: 'Carte documentée manuellement (allowlist) ; voir texte officiel.',
    heuristic_uncertain: 'Texte insuffisant ou ambigu pour classer l’effet (heuristique).',
};

export function fidraulisGyTaxonLabelFr(taxon: FidraulisGyResourceTaxon): string {
    return FIDRAULIS_GY_TAXON_LABEL_FR[taxon];
}

/** Libellé une ligne pour tableau (sans répéter le nom de carte). */
export const FIDRAULIS_GY_TAXON_TABLE_SHORT_FR: Record<FidraulisGyResourceTaxon, string> = {
    extra_synchro_to_gy_fid_cost: 'Coût Fidraulis : Extra → Cimetière',
    effect_on_sent_to_gy: 'Déclenché si envoyé au Cimetière',
    field_or_gy_continuous: 'Actif sur le Terrain ou au Cimetière',
    effect_if_in_gy: 'Lorsqu’elle est au cimetière',
    discard_cost: 'Coût / défausse (heuristique)',
    other_documented: 'Allowlist — voir texte officiel',
    heuristic_uncertain: 'Effet non classé (heuristique)',
};

export function fidraulisGyTaxonTableShortFr(taxon: FidraulisGyResourceTaxon): string {
    return FIDRAULIS_GY_TAXON_TABLE_SHORT_FR[taxon];
}
