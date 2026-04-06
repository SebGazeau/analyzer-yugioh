/**
 * Libellés d’affichage des groupes du rapport associations (liste / Markdown).
 */

import { TEXT_GUILLEMET_CLOSE, TEXT_GUILLEMET_OPEN } from '../utils/textPlaceholders.js';

/** `displayLabel` de l’exemple `EXAMPLE_BLUE_EYES_TEXT_RULES` (buildReport). */
export const EXAMPLE_BLUE_EYES_TEXT_RULE_DISPLAY_LABEL = 'Citation texte : Yeux Bleus / Blue-Eyes';

export function associationGroupDisplayLabelSameArchetype(arch: string): string {
    return `Même archétype : ${arch}`;
}

export const ASSOCIATION_GROUP_DISPLAY_YGORG_QA = 'Même réponse Q&A (base YGResources)';

export function associationGroupDisplayLabelTextCiting(primary: string): string {
    return `Texte citant ${TEXT_GUILLEMET_OPEN} ${primary} ${TEXT_GUILLEMET_CLOSE}`;
}

/** Règle dynamique `text_arch:*` (citation depuis libellé d’archétype). */
export function associationGroupDisplayLabelCitationText(label: string): string {
    return `Citation texte : ${label}`;
}

/** Règle dynamique `text_name:*` (mot extrait du nom). */
export function associationGroupDisplayLabelCitationNameWord(w: string): string {
    return `Citation texte (mot du nom) : ${TEXT_GUILLEMET_OPEN} ${w} ${TEXT_GUILLEMET_CLOSE}`;
}
