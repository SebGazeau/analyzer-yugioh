/**
 * Libellés et fragments HTML texte du rapport affiché dans le modal associations.
 */

import {
    TEXT_ELLIPSIS,
    TEXT_EM_DASH,
    TEXT_GUILLEMET_CLOSE,
    TEXT_GUILLEMET_OPEN,
    TEXT_MIDDLE_DOT,
} from '../utils/textPlaceholders.js';

export const ASSOCIATIONS_MODAL_REPORT_STAT_ANGLES_LABEL = 'angle(s) avec cartes';

export const ASSOCIATIONS_MODAL_REPORT_STAT_DISTINCT_CARDS_LABEL = 'carte(s) distincte(s)';

/** Contenu interne du paragraphe d’aide (déjà du HTML léger). */
export const ASSOCIATIONS_MODAL_REPORT_ADD_HINT_INNER_HTML =
    'Clique une <strong>vignette</strong> ci-dessous pour <strong>ajouter la carte au deck</strong> (comme le + du builder).';

export const ASSOCIATIONS_MODAL_REPORT_ANCHOR_SECTION_LABEL = `Ancre ${TEXT_EM_DASH} métadonnées`;

export const ASSOCIATIONS_MODAL_REPORT_ARCHETYPE_API_STRONG_PREFIX = `Archétype(s) ${TEXT_EM_DASH} champ API`;

export const ASSOCIATIONS_MODAL_REPORT_ARCHETYPE_PROVENANCE_STRONG = 'Provenance archétype';

export const ASSOCIATIONS_MODAL_REPORT_ANCHOR_NOTE_INNER_HTML = `Le groupe ${TEXT_GUILLEMET_OPEN} même archétype ${TEXT_GUILLEMET_CLOSE} repose sur ce champ (souvent YGOProDeck). S’il ne correspond pas au jeu papier, la base importée est en cause ${TEXT_EM_DASH} pas la logique de regroupement.`;

export function associationsModalReportArchetypeLineJoined(segments: readonly string[]): string {
    return segments.join(` ${TEXT_MIDDLE_DOT} `);
}

export function associationsModalReportEmptyArchetypeDisplay(): string {
    return `${TEXT_EM_DASH} (aucun archétype structuré dans les données)`;
}

export const ASSOCIATIONS_MODAL_REPORT_EMPTY_TITLE = 'Aucune association détectée';

export const ASSOCIATIONS_MODAL_REPORT_EMPTY_TEXT =
    'Consulte les diagnostics éventuels pour comprendre les angles ignorés (archétype absent, textes vides, etc.).';

export const ASSOCIATIONS_MODAL_REPORT_ACC_META_CARDS_LABEL = 'carte(s)';

export const ASSOCIATIONS_MODAL_REPORT_DIAGNOSTICS_HEADING = 'Diagnostics';

export const ASSOCIATIONS_MODAL_REPORT_COPY_MARKDOWN_BTN_LABEL = 'Copier le rapport (Markdown)';

export const ASSOCIATIONS_MODAL_REPORT_MARKDOWN_PREVIEW_SUMMARY = 'Aperçu Markdown';

export function associationsModalReportExpandTilesAriaLabel(restCount: number): string {
    return `Afficher ${restCount} carte${restCount > 1 ? 's' : ''} supplémentaires dans ce groupe`;
}

export function associationsModalReportExpandTilesButtonCaption(restCount: number): string {
    return `+ ${restCount} carte${restCount > 1 ? 's' : ''}${TEXT_ELLIPSIS}`;
}
