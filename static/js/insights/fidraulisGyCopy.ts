/**
 * Textes UI — insight Fidraulis (Synchros « ressource » envoi CY).
 */

export const INSIGHT_FIDRAULIS_GY_TITLE = 'Fidraulis Harmonia';

export const INSIGHT_FIDRAULIS_GY_HELP_LINE =
    'Avec Fidraulis, au palier 4+ révélations tu envoies un Synchro de l’Extra au Cimetière : les lignes ci-dessous sont des **candidats** (vérifié = allowlist historique ou validation admin ; heuristique sur le texte = approximatif ; colonne **Avis** si tu es connecté).';

export const INSIGHT_FIDRAULIS_GY_INTRO_LEAD =
    'Liste les Synchros de ton **Extra Deck** qui peuvent déclencher un effet après envoi au Cimetière. Les entrées **Heuristique** peuvent être inexactes ; vérifie toujours le texte officiel de la carte.';

/** Sous-titre court sous le titre de section (maquette v3). */
export const INSIGHT_FIDRAULIS_GY_SECTION_DESC =
    'Synchros de ton Extra Deck pouvant déclencher un effet après envoi au Cimetière.';

/** Sous-ligne dans un groupe mixte (vérifié + heuristique, même contexte). */
export const INSIGHT_FIDRAULIS_GY_SUBSECTION_HEURISTIC = 'Estimation sur le texte — à confirmer';

/** Libellés bruts renvoyés par `fidraulisAggregateStatsContextLabel` (sans entrée allowlist). */
export const INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_VERIFIED = 'Surtout en vérifié (stats)';
export const INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_MIXED = 'Mixte vérifié / heuristique (stats)';
export const INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_FALLBACK = 'Stats agrégées';

/** Libellé brut renvoyé par `fidraulisAggregateStatsContextLabel` pour le groupe « précaution ». */
export const INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION = 'Surtout en heuristique (stats)';

/** Titre affiché pour ce groupe dans l’UI cartes. */
export const INSIGHT_FIDRAULIS_AGGREGATE_GROUP_DISPLAY_CAUTION =
    'Surtout en heuristique — à prendre avec précaution';

/** Titre du bloc parent regroupant les lignes « stats seules » (hors taxonomie allowlist). */
export const INSIGHT_FIDRAULIS_AGGREGATE_STATS_PARENT_TITLE = 'Au Cimetière (stats agrégées)';

/** Infobulle du bloc parent « stats agrégées ». */
export const INSIGHT_FIDRAULIS_AGGREGATE_STATS_PARENT_TITLE_LONG =
    'Regroupe les cartes classées uniquement à partir des statistiques de cette instance (sans taxonomie allowlist). Les sous-parties distinguent les biais vérifié, mixte et heuristique.';

export const INSIGHT_FIDRAULIS_AGGREGATE_SECTION_DESC =
    'Cartes souvent vues avec Fidraulis dans d’autres decks. La popularité indique la fréquence d’apparition ; la fiabilité indique si la compatibilité est vérifiée ou estimée.';

export function insightFidraulisGySectionMeta(verified: number, heuristic: number): string {
    if (verified > 0 && heuristic > 0) {
        return `${verified} vérifiés · ${heuristic} heuristique${heuristic > 1 ? 's' : ''}`;
    }
    if (verified > 0) {
        return `${verified} vérifié${verified > 1 ? 's' : ''}`;
    }
    return `${heuristic} heuristique${heuristic > 1 ? 's' : ''}`;
}

export const INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL = 'Vérifié';
export const INSIGHT_FIDRAULIS_GY_TRUST_HEURISTIC_LABEL = 'Heuristique';

export const INSIGHT_FIDRAULIS_GY_VOTE_YES_LABEL = 'Oui';
export const INSIGHT_FIDRAULIS_GY_VOTE_NO_LABEL = 'Non';
export const INSIGHT_FIDRAULIS_GY_VOTE_LOGIN_PROMPT =
    'Connectez-vous pour indiquer si l’heuristique vous semble correcte.';
export const INSIGHT_FIDRAULIS_GY_VOTE_THANKS = 'Avis enregistré.';
export const INSIGHT_FIDRAULIS_GY_VOTE_ALREADY = 'Vous avez déjà voté pour cette carte.';

export function insightFidraulisGySummary(total: number, verified: number): string {
    const heur = total - verified;
    if (verified > 0 && heur > 0) {
        return `${total} Synchro(s) Extra : ${verified} vérifié(s), ${heur} heuristique(s).`;
    }
    if (verified > 0) {
        return `${total} Synchro(s) Extra listé(s) (allowlist).`;
    }
    return `${total} Synchro(s) Extra détecté(s) par heuristique sur la description.`;
}
