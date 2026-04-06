/**
 * Textes UI des histogrammes de simulation de tirage (titres, placeholders, messages).
 */

import { DECK_CARD_EDIT_DIALOG_TITLE } from '../utils/deckCardEditLabels.js';
import {
    TEXT_ELLIPSIS,
    TEXT_EM_DASH,
    TEXT_GUILLEMET_CLOSE,
    TEXT_GUILLEMET_OPEN,
} from '../utils/textPlaceholders.js';

/** Nombre de simulations pour un run histogramme (UI + logique). */
export const DRAW_HISTOGRAM_SIM_ITERATIONS = 1000;

export function drawHistogramHeadingIdle(iterations: number): string {
    return `Distribution (${iterations} tirages)`;
}

export function drawHistogramHeadingActive(iterations: number, category: string): string {
    return `Distribution (${iterations} tirages) ${TEXT_EM_DASH} Catégorie : ${category}`;
}

export function drawHistogramExplanationText(iterations: number, category: string): string {
    return `En abscisse : nombre de cartes ${TEXT_GUILLEMET_OPEN} ${category} ${TEXT_GUILLEMET_CLOSE} en main (0, 1, 2, ${TEXT_ELLIPSIS}). Hauteur des barres : nombre de simulations sur ${iterations} ayant ce résultat.`;
}

export function drawHistogramAllCategoriesTitle(iterations: number): string {
    return `Toutes les catégories (${iterations} tirages chacune)`;
}

/** Option placeholder du select catégorie (aucune dans le deck). */
export const DRAW_HISTOGRAM_SELECT_PLACEHOLDER_EMPTY = `${TEXT_EM_DASH} Aucune catégorie ${TEXT_EM_DASH}`;
/** Option placeholder du select catégorie (choix requis). */
export const DRAW_HISTOGRAM_SELECT_PLACEHOLDER_PICK = `${TEXT_EM_DASH} Choisir une catégorie ${TEXT_EM_DASH}`;

/** Message histogramme vide : deck sans catégories assignées. */
export const DRAW_HISTOGRAM_EMPTY_DECK_CATEGORIES_MSG = `Deck vide ou aucune catégorie. Assignez des catégories aux cartes (via ${TEXT_GUILLEMET_OPEN} ${DECK_CARD_EDIT_DIALOG_TITLE} ${TEXT_GUILLEMET_CLOSE}) pour afficher la distribution.`;

export function drawHistogramEmptyCategoryMsg(categoryLabel: string): string {
    return `Aucune donnée pour "${categoryLabel}".`;
}

export function drawHistogramContainerAriaLabel(iterations: number, categoryLabel: string): string {
    return `Distribution sur ${iterations} tirages : ${categoryLabel}`;
}
