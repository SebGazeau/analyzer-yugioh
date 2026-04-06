/**
 * HTML du corps du modal associations (résumé stats, méta ancre, groupes, diagnostics, footer).
 */

import { ARIA_HIDDEN_ATTR, ARIA_LABEL_ATTR } from '../utils/ariaAttrs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { TEXT_EM_DASH, TEXT_MIDDLE_DOT } from '../utils/textPlaceholders.js';
import {
    BTN_TYPE_ATTR,
    BTN_TYPE_BUTTON,
    ROLE_ATTR,
    ROLE_STATUS,
} from '../utils/htmlAttrs.js';
import { archetypeSourceUi } from './archetypeSourceUi.js';
import { parseArchetypesFromField } from './archetype.js';
import {
    ASSOCIATIONS_MODAL_REPORT_ACC_META_CARDS_LABEL,
    ASSOCIATIONS_MODAL_REPORT_ADD_HINT_INNER_HTML,
    ASSOCIATIONS_MODAL_REPORT_ANCHOR_NOTE_INNER_HTML,
    ASSOCIATIONS_MODAL_REPORT_ANCHOR_SECTION_LABEL,
    ASSOCIATIONS_MODAL_REPORT_ARCHETYPE_API_STRONG_PREFIX,
    ASSOCIATIONS_MODAL_REPORT_ARCHETYPE_PROVENANCE_STRONG,
    ASSOCIATIONS_MODAL_REPORT_COPY_MARKDOWN_BTN_LABEL,
    ASSOCIATIONS_MODAL_REPORT_DIAGNOSTICS_HEADING,
    ASSOCIATIONS_MODAL_REPORT_EMPTY_TEXT,
    ASSOCIATIONS_MODAL_REPORT_EMPTY_TITLE,
    ASSOCIATIONS_MODAL_REPORT_MARKDOWN_PREVIEW_SUMMARY,
    ASSOCIATIONS_MODAL_REPORT_STAT_ANGLES_LABEL,
    ASSOCIATIONS_MODAL_REPORT_STAT_DISTINCT_CARDS_LABEL,
    associationsModalReportArchetypeLineJoined,
    associationsModalReportEmptyArchetypeDisplay,
    associationsModalReportExpandTilesAriaLabel,
    associationsModalReportExpandTilesButtonCaption,
} from './associationsModalReportCopy.js';
import { associationsModalTileListItemHtml } from './associationsModalTileHtml.js';
import {
    ASSOCIATIONS_ACTION_COPY_MARKDOWN,
    ASSOCIATIONS_ACTION_EXPAND_TILES,
    ASSOCIATIONS_MODAL_ACC_BADGE_CLASS,
    ASSOCIATIONS_MODAL_ACC_CLASS,
    ASSOCIATIONS_MODAL_ACC_LIST_CLASS,
    ASSOCIATIONS_MODAL_ACC_META_CLASS,
    ASSOCIATIONS_MODAL_ACC_PANEL_CLASS,
    ASSOCIATIONS_MODAL_ACC_SUMMARY_CLASS,
    ASSOCIATIONS_MODAL_ACC_SUMMARY_MAIN_CLASS,
    ASSOCIATIONS_MODAL_ACC_TITLE_CLASS,
    ASSOCIATIONS_MODAL_ADD_HINT_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_LABEL_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_META_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_NOTE_CLASS,
    ASSOCIATIONS_MODAL_ARCH_SOURCE_CLASS,
    ASSOCIATIONS_MODAL_ARCH_SOURCE_CODE_CLASS,
    ASSOCIATIONS_MODAL_BTN_CLASS,
    ASSOCIATIONS_MODAL_DIAGNOSTICS_CLASS,
    ASSOCIATIONS_MODAL_EMPTY_CLASS,
    ASSOCIATIONS_MODAL_EMPTY_TEXT_CLASS,
    ASSOCIATIONS_MODAL_EMPTY_TITLE_CLASS,
    ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT,
    ASSOCIATIONS_MODAL_ERROR_CLASS,
    ASSOCIATIONS_MODAL_EXPAND_TILES_BTN_CLASS,
    ASSOCIATIONS_MODAL_FOOTER_CLASS,
    ASSOCIATIONS_MODAL_PRE_CLASS,
    ASSOCIATIONS_MODAL_RAW_CLASS,
    ASSOCIATIONS_MODAL_STAT_CLASS,
    ASSOCIATIONS_MODAL_STAT_VALUE_CLASS,
    ASSOCIATIONS_MODAL_SUMMARY_CLASS,
    ASSOCIATIONS_MODAL_TILE_GRID_CLASS,
    ASSOCIATIONS_MODAL_TILE_MORE_LI_CLASS,
    DATA_ASSOCIATION_ANGLE_ATTR,
    DATA_ASSOCIATIONS_ACTION_ATTR,
    DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR,
    DATA_ASSOCIATIONS_ARCHETYPE_SOURCE_ATTR,
    ASSOCIATIONS_REST_IDS_VALUE_SEPARATOR,
    DATA_ASSOCIATIONS_REST_IDS_ATTR,
    DATA_ASSOCIATIONS_TILE_MORE_ATTR,
} from './associationsDomSelectors.js';
import { ASSOCIATIONS_MODAL_TILES_INITIAL, splitAssociationTileIdsForDisplay } from './modalTileLimit.js';
import type { AssociationCatalogCard, AssociationGroup, AssociationReport } from './types.js';

function countAssociationStats(groups: AssociationGroup[]): {
    groupsWithCards: number;
    uniqueCardCount: number;
} {
    const groupsWithCards = groups.filter((g) => g.cardIds.length > 0).length;
    const ids = new Set<number>();
    for (const g of groups) {
        for (const id of g.cardIds) ids.add(id);
    }
    return { groupsWithCards, uniqueCardCount: ids.size };
}

/** Paragraphe d’erreur quand le catalogue ne charge pas. */
export function associationsModalCatalogLoadErrorParagraphHtml(): string {
    return `<p class="${ASSOCIATIONS_MODAL_ERROR_CLASS}">${ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT}</p>`;
}

/** Corps HTML du rapport (remplace le contenu de `#associations-modal-body`). */
export function associationsModalReportBodyHtml(
    report: AssociationReport,
    catalog: AssociationCatalogCard[],
    anchor: AssociationCatalogCard,
    markdown: string,
): string {
    const idToCard = new Map<number, AssociationCatalogCard>();
    for (const c of catalog) idToCard.set(c.id, c);
    const archParsed = parseArchetypesFromField(anchor.archetype ?? undefined);
    const archLine =
        archParsed.length > 0 ? associationsModalReportArchetypeLineJoined(archParsed) : associationsModalReportEmptyArchetypeDisplay();
    const { groupsWithCards, uniqueCardCount } = countAssociationStats(report.groups);

    const parts: string[] = [];
    parts.push(`<div class="${ASSOCIATIONS_MODAL_SUMMARY_CLASS}" ${ROLE_ATTR}="${ROLE_STATUS}">`);
    parts.push(
        `<span class="${ASSOCIATIONS_MODAL_STAT_CLASS}"><span class="${ASSOCIATIONS_MODAL_STAT_VALUE_CLASS}">${groupsWithCards}</span> ${ASSOCIATIONS_MODAL_REPORT_STAT_ANGLES_LABEL}</span>`,
    );
    parts.push(
        `<span class="${ASSOCIATIONS_MODAL_STAT_CLASS}"><span class="${ASSOCIATIONS_MODAL_STAT_VALUE_CLASS}">${uniqueCardCount}</span> ${ASSOCIATIONS_MODAL_REPORT_STAT_DISTINCT_CARDS_LABEL}</span>`,
    );
    parts.push(`</div>`);
    parts.push(
        `<p class="${ASSOCIATIONS_MODAL_ADD_HINT_CLASS}">${ASSOCIATIONS_MODAL_REPORT_ADD_HINT_INNER_HTML}</p>`,
    );

    parts.push(`<div class="${ASSOCIATIONS_MODAL_ANCHOR_META_CLASS}">`);
    parts.push(`<p class="${ASSOCIATIONS_MODAL_ANCHOR_LABEL_CLASS}">${ASSOCIATIONS_MODAL_REPORT_ANCHOR_SECTION_LABEL}</p>`);
    parts.push(
        `<p><strong>${ASSOCIATIONS_MODAL_REPORT_ARCHETYPE_API_STRONG_PREFIX}</strong> : ${escapeHtml(archLine)}</p>`,
    );
    const srcRaw = anchor.archetype_source?.trim();
    if (srcRaw) {
        const { short, title } = archetypeSourceUi(srcRaw);
        parts.push(
            `<p><strong>${ASSOCIATIONS_MODAL_REPORT_ARCHETYPE_PROVENANCE_STRONG}</strong> : <span class="${ASSOCIATIONS_MODAL_ARCH_SOURCE_CLASS}" ${DATA_ASSOCIATIONS_ARCHETYPE_SOURCE_ATTR}="${escapeAttr(
                srcRaw,
            )}" title="${escapeAttr(title)}">${escapeHtml(short || srcRaw)}</span> <code class="${ASSOCIATIONS_MODAL_ARCH_SOURCE_CODE_CLASS}">${escapeHtml(
                srcRaw,
            )}</code></p>`,
        );
    }
    parts.push(
        `<p class="${ASSOCIATIONS_MODAL_ANCHOR_NOTE_CLASS}">${ASSOCIATIONS_MODAL_REPORT_ANCHOR_NOTE_INNER_HTML}</p>`,
    );
    parts.push(`</div>`);

    if (report.groups.length === 0) {
        parts.push(`<div class="${ASSOCIATIONS_MODAL_EMPTY_CLASS}">`);
        parts.push(`<p class="${ASSOCIATIONS_MODAL_EMPTY_TITLE_CLASS}">${ASSOCIATIONS_MODAL_REPORT_EMPTY_TITLE}</p>`);
        parts.push(
            `<p class="${ASSOCIATIONS_MODAL_EMPTY_TEXT_CLASS}">${ASSOCIATIONS_MODAL_REPORT_EMPTY_TEXT}</p>`,
        );
        parts.push(`</div>`);
    }

    parts.push(`<div class="${ASSOCIATIONS_MODAL_ACC_LIST_CLASS}">`);
    for (let gi = 0; gi < report.groups.length; gi++) {
        const g = report.groups[gi];
        const openAttr = gi === 0 ? ' open' : '';
        parts.push(
            `<details class="${ASSOCIATIONS_MODAL_ACC_CLASS}"${openAttr} ${DATA_ASSOCIATION_ANGLE_ATTR}="${escapeAttr(g.angleId)}">`,
        );
        parts.push(`<summary class="${ASSOCIATIONS_MODAL_ACC_SUMMARY_CLASS}">`);
        parts.push(`<span class="${ASSOCIATIONS_MODAL_ACC_SUMMARY_MAIN_CLASS}">`);
        parts.push(`<span class="${ASSOCIATIONS_MODAL_ACC_TITLE_CLASS}">${escapeHtml(g.displayLabel)}</span>`);
        parts.push(
            `<span class="${ASSOCIATIONS_MODAL_ACC_META_CLASS}"><span>${escapeHtml(g.linkStrength)}</span> ${TEXT_MIDDLE_DOT} ${g.cardIds.length} ${ASSOCIATIONS_MODAL_REPORT_ACC_META_CARDS_LABEL} ${TEXT_MIDDLE_DOT} <code>${escapeHtml(g.angleId)}</code></span>`,
        );
        parts.push(`</span>`);
        parts.push(
            `<span class="${ASSOCIATIONS_MODAL_ACC_BADGE_CLASS}" ${ARIA_HIDDEN_ATTR}="true">${g.cardIds.length}</span>`,
        );
        parts.push(`</summary>`);
        parts.push(`<div class="${ASSOCIATIONS_MODAL_ACC_PANEL_CLASS}">`);
        parts.push(`<ul class="${ASSOCIATIONS_MODAL_TILE_GRID_CLASS}">`);
        const { visible, rest } = splitAssociationTileIdsForDisplay(g.cardIds, ASSOCIATIONS_MODAL_TILES_INITIAL);
        for (const id of visible) {
            parts.push(associationsModalTileListItemHtml(id, idToCard));
        }
        if (rest.length > 0) {
            const idsAttr = rest.join(ASSOCIATIONS_REST_IDS_VALUE_SEPARATOR);
            parts.push(
                `<li class="${ASSOCIATIONS_MODAL_TILE_MORE_LI_CLASS}" ${DATA_ASSOCIATIONS_TILE_MORE_ATTR}="1"><button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${ASSOCIATIONS_MODAL_EXPAND_TILES_BTN_CLASS}" ${DATA_ASSOCIATIONS_ACTION_ATTR}="${ASSOCIATIONS_ACTION_EXPAND_TILES}" ${DATA_ASSOCIATIONS_REST_IDS_ATTR}="${escapeAttr(idsAttr)}" ${ARIA_LABEL_ATTR}="${escapeAttr(associationsModalReportExpandTilesAriaLabel(rest.length))}">${associationsModalReportExpandTilesButtonCaption(rest.length)}</button></li>`,
            );
        }
        parts.push('</ul></div></details>');
    }
    parts.push('</div>');

    if (report.diagnostics.length > 0) {
        parts.push(`<section class="${ASSOCIATIONS_MODAL_DIAGNOSTICS_CLASS}"><h3>${ASSOCIATIONS_MODAL_REPORT_DIAGNOSTICS_HEADING}</h3><ul>`);
        for (const d of report.diagnostics) {
            parts.push(
                `<li ${DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR}="${escapeAttr(d.severity)}"><strong>${escapeHtml(d.code)}</strong> ${TEXT_EM_DASH} ${escapeHtml(d.message)}</li>`,
            );
        }
        parts.push('</ul></section>');
    }

    parts.push(`<div class="${ASSOCIATIONS_MODAL_FOOTER_CLASS}">`);
    parts.push(
        `<button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${ASSOCIATIONS_MODAL_BTN_CLASS}" ${DATA_ASSOCIATIONS_ACTION_ATTR}="${ASSOCIATIONS_ACTION_COPY_MARKDOWN}">${ASSOCIATIONS_MODAL_REPORT_COPY_MARKDOWN_BTN_LABEL}</button>`,
    );
    parts.push(
        `<details class="${ASSOCIATIONS_MODAL_RAW_CLASS}"><summary>${ASSOCIATIONS_MODAL_REPORT_MARKDOWN_PREVIEW_SUMMARY}</summary><pre class="${ASSOCIATIONS_MODAL_PRE_CLASS}">${escapeHtml(
            markdown,
        )}</pre></details>`,
    );
    parts.push(`</div>`);

    return parts.join('');
}
