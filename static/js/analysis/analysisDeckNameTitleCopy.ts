/**
 * Texte affiché pour le nom du deck dans l’en-tête de l’onglet Analysis.
 */

import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';

/** Ligne « {nom} — » (tiret cadratin + espace final, comme le template historique). */
export function analysisDeckNameHeaderText(deckName: string): string {
    const text = deckName.trim();
    return text ? `${text} ${TEXT_EM_DASH} ` : '';
}
