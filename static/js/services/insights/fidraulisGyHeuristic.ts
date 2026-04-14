/**
 * Détection **approximative** d’effets utiles une fois la carte au Cimetière (Fidraulis).
 *
 * - **Envoi au CY** : `cardDescLooksLikeGySendTrigger` (déclencheur « si / quand envoyé… »).
 * - **Présence Terrain + CY** : `cardDescLooksLikeGyWhileOnFieldOrInGy` (effet passif « tant que /
 *   while … sur le Terrain ou dans le CY », ex. Wind Pegasus @Ignister).
 *
 * **Limites** : faux positifs / négatifs ; multilingue partiel (FR + EN). Ne remplace pas l’allowlist.
 */

function normalizeDesc(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
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
