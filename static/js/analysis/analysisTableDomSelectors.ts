/**
 * Tableau Analysis repliable (sections Engines / Catégories / Groupes).
 */

export const ANALYSIS_TABLE_CLASS = 'analysis-table';
export const ANALYSIS_TABLE_SELECTOR = `.${ANALYSIS_TABLE_CLASS}`;

export const DATA_SECTION_HEADER_ATTR = 'data-section-header';
/** Ligne d’en-tête de section repliable (Engines / Catégories / Groupes). */
export const ANALYSIS_SECTION_HEADER_ROW_CLASS = 'analysis-section-header';
/** Lignes d’en-tête de section (classe + optionnellement `data-section-header`). */
export const ANALYSIS_SECTION_HEADER_ROW_SELECTOR = `tr.${ANALYSIS_SECTION_HEADER_ROW_CLASS}`;

export const ANALYSIS_SECTION_HEADER_TOGGLE_CLASS = 'analysis-section-header-toggle';
export const ANALYSIS_SECTION_HEADER_TOGGLE_SELECTOR = `.${ANALYSIS_SECTION_HEADER_TOGGLE_CLASS}`;
/** Caractère visible du repliable (▼, U+25BC). */
export const ANALYSIS_SECTION_HEADER_TOGGLE_TEXT = '\u25BC';

/** Lignes de données rattachées à une section (`engines`, `categories`, `groupes`). */
export const DATA_ANALYSIS_TABLE_SECTION_ATTR = 'data-section';
/** Sections tableau (en-têtes `data-section-header` + lignes `data-section`). */
export const ANALYSIS_TABLE_SECTION_ENGINES = 'engines';
export const ANALYSIS_TABLE_SECTION_CATEGORIES = 'categories';
export const ANALYSIS_TABLE_SECTION_GROUPES = 'groupes';

/** Nombre de colonnes du corps du tableau analysis (lignes d’en-tête section : `<td colspan="…">`). */
export const ANALYSIS_TABLE_BODY_COLSPAN = 9;

/** Classe sur `.analysis-table` quand la section `sectionId` est repliée (ex. `section-engines-collapsed`). */
export function analysisTableSectionCollapsedClass(sectionId: string): string {
    return `section-${sectionId}-collapsed`;
}
