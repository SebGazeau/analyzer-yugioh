/**
 * Détection **approximative** d’un effet déclenchable depuis le Cimetière après envoi.
 *
 * **Limites v1** : faux positifs (coût « envoyer au CY »), faux négatifs (tournures rares) ;
 * multilingue partiel (FR + EN). Ne remplace pas l’allowlist.
 */

function normalizeDesc(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
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
