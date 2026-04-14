/**
 * Textes UI — insight Fidraulis (Synchros « ressource » envoi CY).
 */

export const INSIGHT_FIDRAULIS_GY_TITLE = 'Fidraulis Harmonia';

export const INSIGHT_FIDRAULIS_GY_HELP_LINE =
    'Avec Fidraulis, au palier 4+ révélations tu envoies un Synchro de l’Extra au Cimetière : les lignes ci-dessous sont des **candidats** (allowlist = fiable ; heuristique sur le texte = approximatif).';

export const INSIGHT_FIDRAULIS_GY_INTRO_LEAD =
    'Liste les Synchros de ton **Extra Deck** qui peuvent déclencher un effet après envoi au Cimetière. Les entrées **Heuristique** peuvent être inexactes ; vérifie toujours le texte officiel de la carte.';

export const INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL = 'Vérifié';
export const INSIGHT_FIDRAULIS_GY_TRUST_HEURISTIC_LABEL = 'Heuristique';

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
