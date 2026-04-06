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
