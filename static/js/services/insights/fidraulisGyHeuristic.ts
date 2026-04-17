/**
 * Détection **approximative** d’effets utiles une fois la carte au Cimetière (Fidraulis).
 *
 * - **Envoi au CY** : `cardDescLooksLikeGySendTrigger` (déclencheur « si / quand envoyé… »).
 * - **Présence Terrain + CY** : `cardDescLooksLikeGyWhileOnFieldOrInGy` (effet passif « tant que /
 *   while … sur le Terrain ou dans le CY », ex. Wind Pegasus @Ignister).
 * - **Déjà au CY** : `cardDescLooksLikeGyIfInGyActivated` (PSCT « If this card is in your GY: » —
 *   ex. dernier effet Quick de PSY-Framelord Omega, sans formulation « sent to the GY »).
 *
 * `inferFidraulisGyResourceTaxon` classe grossièrement le « quel effet » pour l’UI ; reste **approximatif**
 * (faux positifs / négatifs ; multilingue partiel FR + EN). Ne remplace pas l’allowlist.
 */
import type { FidraulisGyResourceTaxon } from '../../insights/types.js';

function normalizeDesc(s: string): string {
    return s
        .trim()
        .toLowerCase()
        // NBSP / espace étroit (textes Konami ou copier-coller) : `\s` JS ne les couvre pas tous.
        .replace(/\u00a0|\u202f/g, ' ')
        .replace(/\s+/g, ' ');
}

/** Pour sous-chaînes FR : aligne graphies BDD (ASCII) et cartes (accents). */
function stripCombiningMarks(s: string): string {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function frWhileOnFieldOrInGyPhrasesMatch(d: string): boolean {
    const x = stripCombiningMarks(d);
    const phrases = [
        'tant que cette carte est sur le terrain ou dans le cimetière',
        'tant que cette carte est au terrain ou au cimetière',
        'tant que cette carte est sur le terrain ou au cimetière',
    ];
    return phrases.some((p) => x.includes(stripCombiningMarks(p)));
}

/**
 * Retourne `true` si la description ressemble à une condition « carte envoyée au Cimetière »
 * (ou bannie à la place d’un envoi), assez restrictive pour limiter le bruit.
 */
export function cardDescLooksLikeGySendTrigger(desc: string): boolean {
    const d = normalizeDesc(desc);
    if (d.length < 12) return false;

    // Anglais — formulations PSCT fréquentes
    if (/\bif this card is sent\b/.test(d) && /\b(gy|graveyard)\b/.test(d)) return true;
    if (/\bif this synchro monster is sent\b/.test(d) && /\b(gy|graveyard)\b/.test(d)) return true;
    if (/\bwhen this card is sent\b/.test(d) && /\b(gy|graveyard)\b/.test(d)) return true;
    if (/\bsent to the (gy|graveyard)\b/.test(d) && (/\bif\b/.test(d) || /\bwhen\b/.test(d))) return true;
    if (/\bbanished instead of being sent\b/.test(d) && /\b(gy|graveyard)\b/.test(d)) return true;

    // Français
    if (/envoyée? au cimetière/.test(d) && (/\bsi\b/.test(d) || /\bquand\b/.test(d) || /cette carte/.test(d)))
        return true;
    if (/envoyée? au cimetière/.test(d) && /monstre synchro/.test(d)) return true;

    return false;
}

/**
 * Effet actif **tant que** la carte est sur le Terrain **ou** dans le Cimetière (PSCT EN / FR courants).
 * Distinct du trigger « envoyé au CY » ; reste classé `heuristic` côté insight.
 */
export function cardDescLooksLikeGyWhileOnFieldOrInGy(desc: string): boolean {
    const d = normalizeDesc(desc);
    if (d.length < 28) return false;

    if (/\bwhile this card is on the field or in the (gy|graveyard)\b/.test(d)) return true;
    if (/\bwhile this synchro monster is on the field or in the (gy|graveyard)\b/.test(d)) return true;

    if (frWhileOnFieldOrInGyPhrasesMatch(d)) return true;

    return false;
}

/**
 * Effet activé **si** la carte est **déjà** dans le Cimetière (PSCT EN / FR courants), distinct de
 * « envoyée au Cimetière » et de « tant que sur le Terrain ou au Cimetière ».
 */
export function cardDescLooksLikeGyIfInGyActivated(desc: string): boolean {
    const d = normalizeDesc(desc);
    if (d.length < 22) return false;
    if (/\bif this card is in your (gy|graveyard)\b/.test(d)) return true;
    if (/\bif this synchro monster is in your (gy|graveyard)\b/.test(d)) return true;
    const x = stripCombiningMarks(d);
    if (/\bsi cette carte est dans votre (cimetiere|gy)\b/.test(x)) return true;
    if (/\bsi ce monstre synchro est dans votre (cimetiere|gy)\b/.test(x)) return true;
    return false;
}

function cardDescLooksLikeDiscardCost(desc: string): boolean {
    const d = normalizeDesc(desc);
    if (d.length < 16) return false;
    const hasDiscard = /\bdiscard\b/.test(d) || /\bdéfauss\w*\b/.test(d);
    if (!hasDiscard) return false;
    return (
        /\bhand\b/.test(d) ||
        /\bmain\b/.test(d) ||
        /\bcard\b/.test(d) ||
        /\bcarte\b/.test(d) ||
        /\bco[uû]t\b/.test(d) ||
        /\bcost\b/.test(d)
    );
}

/**
 * Taxon dérivé du texte d’effet (heuristique uniquement — allowlist prioritaire côté insight).
 */
export function inferFidraulisGyResourceTaxon(desc: string): FidraulisGyResourceTaxon {
    if (cardDescLooksLikeGySendTrigger(desc)) return 'effect_on_sent_to_gy';
    if (cardDescLooksLikeGyWhileOnFieldOrInGy(desc)) return 'field_or_gy_continuous';
    if (cardDescLooksLikeGyIfInGyActivated(desc)) return 'effect_if_in_gy';
    if (cardDescLooksLikeDiscardCost(desc)) return 'discard_cost';
    return 'heuristic_uncertain';
}
