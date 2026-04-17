/**
 * HTML des `<tr>` des tableaux onglet Suggestions (résumé insights, Number XYZ, détail Seventh Tachyon).
 */

import {
    INSIGHTS_CARD_LINE_DATA_ATTR,
    INSIGHTS_CELL_DATA_ATTR,
    INSIGHTS_DETAIL_ROW_DATA_ATTR,
    INSIGHTS_EMPTY_CELL_DATA_ATTR,
    INSIGHTS_FIND_CARD_BUTTON_CLASS,
    INSIGHTS_FIND_CARD_DATA_ATTR,
    INSIGHTS_KIND_DATA_ATTR,
    INSIGHTS_MATCHES_MAIN_DATA_ATTR,
    INSIGHTS_SEVERITY_DATA_ATTR,
    INSIGHTS_SUGGEST_NAME_DATA_ATTR,
    INSIGHTS_SUGGEST_ROW_DATA_ATTR,
    INSIGHTS_SUMMARY_ROW_DATA_ATTR,
    SUGGESTIONS_TARGET_LIST_CLASS,
    INSIGHTS_FIND_CARD_BUTTON_LABEL,
    INSIGHTS_FIND_CARD_BUTTON_TITLE,
    INSIGHTS_NUMBER_SUGGESTION_ATTR_RACE_SEPARATOR,
    INSIGHTS_SUGGEST_ROW_TITLE,
} from './insightsDomSelectors.js';
import { insightsMainMatchChipsHtml } from './insightsMainMatchChipsHtml.js';
import { insightsTableKindLabel, insightsTableSeverityLabel } from './insightsPanelTableCopy.js';
import type { DeckInsight, NumberXyzSuggestion, SeventhTachyonXyzGroup } from './types.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON, TITLE_ATTR } from '../utils/htmlAttrs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { DECK_DEFAULT_ROW_QUANTITY } from '../deck-builder/deckConstants.js';
import { TEXT_EM_DASH, TEXT_MULTIPLICATION_SIGN } from '../utils/textPlaceholders.js';

/** Lignes du tableau résumé (liste des insights). */
export function insightsSummaryRowsHtml(insights: DeckInsight[]): string {
    return insights
        .map(
            (i) => `
    <tr ${INSIGHTS_SUMMARY_ROW_DATA_ATTR} ${INSIGHTS_KIND_DATA_ATTR}="${escapeHtml(i.kind)}" ${INSIGHTS_SEVERITY_DATA_ATTR}="${escapeHtml(i.severity)}">
      <td ${INSIGHTS_CELL_DATA_ATTR}="kind">${escapeHtml(insightsTableKindLabel(i.kind))}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="severity">${escapeHtml(insightsTableSeverityLabel(i.severity))}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="title">${escapeHtml(i.title)}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="summary">${escapeHtml(i.summary)}</td>
    </tr>`,
        )
        .join('');
}

/** Lignes du tableau « Xyz Number proposés ». */
export function insightsNumberSuggestionRowsHtml(suggested: NumberXyzSuggestion[]): string {
    return suggested
        .map((s) => {
            const nameEsc = escapeHtml(s.name);
            const nameAttr = escapeAttr(s.name);
            const attrRace = `${escapeHtml(s.attribute)}${INSIGHTS_NUMBER_SUGGESTION_ATTR_RACE_SEPARATOR}${escapeHtml(s.race)}`;
            const matchCell = insightsMainMatchChipsHtml(s.matchingCards);
            return `
    <tr ${INSIGHTS_SUGGEST_ROW_DATA_ATTR} ${INSIGHTS_MATCHES_MAIN_DATA_ATTR}="${s.matchesDeck ? 'true' : 'false'}" ${INSIGHTS_SUGGEST_NAME_DATA_ATTR}="${nameAttr}" ${TITLE_ATTR}="${INSIGHTS_SUGGEST_ROW_TITLE}">
      <td ${INSIGHTS_CELL_DATA_ATTR}="name">${nameEsc}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="num">${s.numberIndex}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="rank">${s.rank}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="attr-race">${attrRace}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="match">${matchCell}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="action">
        <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${INSIGHTS_FIND_CARD_BUTTON_CLASS}" ${INSIGHTS_FIND_CARD_DATA_ATTR}="${nameAttr}" ${TITLE_ATTR}="${INSIGHTS_FIND_CARD_BUTTON_TITLE}">${INSIGHTS_FIND_CARD_BUTTON_LABEL}</button>
      </td>
    </tr>`;
        })
        .join('');
}

export { insightsFidraulisGyRowsHtml } from './fidraulisGySuggestionsHtml.js';

/** Lignes du tableau détail Seventh Tachyon (groupes Xyz + cibles). */
export function insightsSeventhTachyonDetailRowsHtml(groups: SeventhTachyonXyzGroup[]): string {
    return groups
        .map((g) => {
            const targetsHtml =
                g.targets.length === 0
                    ? `<span ${INSIGHTS_EMPTY_CELL_DATA_ATTR}>${TEXT_EM_DASH}</span>`
                    : `<ul class="${SUGGESTIONS_TARGET_LIST_CLASS}">${g.targets
                          .map(
                              (t) =>
                                  `<li ${INSIGHTS_CARD_LINE_DATA_ATTR}>${escapeHtml(t.name)}${t.quantity > DECK_DEFAULT_ROW_QUANTITY ? ` ${TEXT_MULTIPLICATION_SIGN}${t.quantity}` : ''}</li>`,
                          )
                          .join('')}</ul>`;
            return `
    <tr ${INSIGHTS_DETAIL_ROW_DATA_ATTR}>
      <td ${INSIGHTS_CELL_DATA_ATTR}="xyz">${escapeHtml(g.xyzName)}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="num">${g.numberIndex}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="rank">${g.rank}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="targets">${targetsHtml}</td>
    </tr>`;
        })
        .join('');
}
