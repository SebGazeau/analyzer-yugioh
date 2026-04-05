import { getDeckState } from '../deck.js';
import { deckSectionMainSideShortLabel } from '../deckSection.js';
import { collectDeckInsights } from './collect.js';
import {
    INSIGHTS_ADD_DECK_CARD_DATA_ATTR,
    INSIGHTS_CARD_LINE_DATA_ATTR,
    INSIGHTS_CARD_NAME_DATA_ATTR,
    INSIGHTS_CELL_DATA_ATTR,
    INSIGHTS_DETAIL_ROW_DATA_ATTR,
    INSIGHTS_DETAIL_TBODY_SELECTOR,
    INSIGHTS_EMPTY_CELL_DATA_ATTR,
    INSIGHTS_FIND_CARD_BUTTON_CLASS,
    INSIGHTS_FIND_CARD_DATA_ATTR,
    INSIGHTS_KIND_DATA_ATTR,
    INSIGHTS_MAIN_MATCH_DATA_ATTR,
    INSIGHTS_MAIN_MATCHES_DATA_ATTR,
    INSIGHTS_MATCH_THUMB_DATA_ATTR,
    INSIGHTS_MATCHES_MAIN_DATA_ATTR,
    INSIGHTS_NAV_TAB_SELECTOR,
    INSIGHTS_NUMBER_TBODY_SELECTOR,
    INSIGHTS_PAGE_HELP_SELECTOR,
    INSIGHTS_SECTION_DATA_ATTR,
    INSIGHTS_SEVERITY_DATA_ATTR,
    INSIGHTS_SUGGEST_NAME_DATA_ATTR,
    INSIGHTS_SUGGEST_ROW_DATA_ATTR,
    INSIGHTS_SUMMARY_ROW_DATA_ATTR,
    INSIGHTS_SUMMARY_TBODY_SELECTOR,
    SUGGESTIONS_DETAIL_WRAP_SELECTOR,
    SUGGESTIONS_MAIN_MATCH_CHIP_CLASS,
    SUGGESTIONS_MAIN_MATCH_NAME_CLASS,
    SUGGESTIONS_MAIN_MATCH_QTY_CLASS,
    SUGGESTIONS_MAIN_MATCH_SECTION_CLASS,
    SUGGESTIONS_MAIN_MATCH_THUMB_CLASS,
    SUGGESTIONS_MAIN_MATCHES_CLASS,
    SUGGESTIONS_NUMBER_WRAP_SELECTOR,
    SUGGESTIONS_TARGET_LIST_CLASS,
    suggestionsMainMatchThumbEmptyClassName,
} from './insightsDomSelectors.js';
import type { DeckInsight, MatchingCardPreview, NumberXyzSuggestion } from './types.js';
import {
    APP_TAB_ACTIVE_SELECTOR,
    setActiveTab,
    TAB_DATA_ATTR,
    TAB_ID_BUILDER,
    TAB_ID_SUGGESTIONS,
} from '../tabs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';

function severityLabel(sev: string): string {
    return sev === 'active' ? 'Actif' : 'Info';
}

function kindLabel(kind: string): string {
    if (kind === 'seventh_tachyon') return 'Seventh Tachyon';
    return kind;
}

function renderSummaryRows(insights: DeckInsight[]): string {
    return insights
        .map(
            (i) => `
    <tr ${INSIGHTS_SUMMARY_ROW_DATA_ATTR} ${INSIGHTS_KIND_DATA_ATTR}="${escapeHtml(i.kind)}" ${INSIGHTS_SEVERITY_DATA_ATTR}="${escapeHtml(i.severity)}">
      <td ${INSIGHTS_CELL_DATA_ATTR}="kind">${escapeHtml(kindLabel(i.kind))}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="severity">${escapeHtml(severityLabel(i.severity))}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="title">${escapeHtml(i.title)}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="summary">${escapeHtml(i.summary)}</td>
    </tr>`,
        )
        .join('');
}

function renderMatchChips(cards: MatchingCardPreview[]): string {
    if (cards.length === 0) return `<span ${INSIGHTS_EMPTY_CELL_DATA_ATTR}>—</span>`;
    return `<div class="${SUGGESTIONS_MAIN_MATCHES_CLASS}" ${INSIGHTS_MAIN_MATCHES_DATA_ATTR}>${cards
        .map((c) => {
            const nameEsc = escapeHtml(c.name);
            const nameAttr = escapeAttr(c.name);
            const qty =
                c.quantity > 1
                    ? `<span class="${SUGGESTIONS_MAIN_MATCH_QTY_CLASS}" aria-label="${c.quantity} exemplaires">×${c.quantity}</span>`
                    : '';
            const sectionBadge = `<span class="${SUGGESTIONS_MAIN_MATCH_SECTION_CLASS}" ${INSIGHTS_SECTION_DATA_ATTR}="${c.section}">${escapeHtml(deckSectionMainSideShortLabel(c.section))}</span>`;
            const thumb =
                c.imageUrl && c.imageUrl.trim() !== ''
                    ? `<img class="${SUGGESTIONS_MAIN_MATCH_THUMB_CLASS}" src="${escapeAttr(c.imageUrl)}" alt="" width="44" height="64" loading="lazy" ${INSIGHTS_MATCH_THUMB_DATA_ATTR} />`
                    : `<span class="${suggestionsMainMatchThumbEmptyClassName()}" ${INSIGHTS_MATCH_THUMB_DATA_ATTR} aria-hidden="true">?</span>`;
            return `<div class="${SUGGESTIONS_MAIN_MATCH_CHIP_CLASS}" ${INSIGHTS_MAIN_MATCH_DATA_ATTR} ${INSIGHTS_ADD_DECK_CARD_DATA_ATTR}="1" ${INSIGHTS_CARD_NAME_DATA_ATTR}="${nameAttr}" ${INSIGHTS_SECTION_DATA_ATTR}="${c.section}" title="Cliquer pour ajouter 1 exemplaire (${deckSectionMainSideShortLabel(c.section)})" role="button" tabindex="0">
        ${thumb}
        <span class="${SUGGESTIONS_MAIN_MATCH_NAME_CLASS}">${nameEsc}</span>
        ${sectionBadge}
        ${qty}
      </div>`;
        })
        .join('')}</div>`;
}

function renderNumberSuggestionRows(suggested: NumberXyzSuggestion[]): string {
    return suggested
        .map((s) => {
            const nameEsc = escapeHtml(s.name);
            const nameAttr = escapeAttr(s.name);
            const attrRace = `${escapeHtml(s.attribute)} / ${escapeHtml(s.race)}`;
            const matchCell = renderMatchChips(s.matchingCards);
            return `
    <tr ${INSIGHTS_SUGGEST_ROW_DATA_ATTR} ${INSIGHTS_MATCHES_MAIN_DATA_ATTR}="${s.matchesDeck ? 'true' : 'false'}" ${INSIGHTS_SUGGEST_NAME_DATA_ATTR}="${nameAttr}" title="Cliquer pour ajouter cette carte au deck (Extra si Xyz)">
      <td ${INSIGHTS_CELL_DATA_ATTR}="name">${nameEsc}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="num">${s.numberIndex}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="rank">${s.rank}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="attr-race">${attrRace}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="match">${matchCell}</td>
      <td ${INSIGHTS_CELL_DATA_ATTR}="action">
        <button type="button" class="${INSIGHTS_FIND_CARD_BUTTON_CLASS}" ${INSIGHTS_FIND_CARD_DATA_ATTR}="${nameAttr}" title="Ouvrir le Builder et rechercher cette carte">Chercher</button>
      </td>
    </tr>`;
        })
        .join('');
}

function renderDetailRows(insight: DeckInsight | undefined): string {
    const groups = insight?.details?.seventhTachyon?.xyzGroups ?? [];
    return groups
        .map((g) => {
            const targetsHtml =
                g.targets.length === 0
                    ? `<span ${INSIGHTS_EMPTY_CELL_DATA_ATTR}>—</span>`
                    : `<ul class="${SUGGESTIONS_TARGET_LIST_CLASS}">${g.targets
                          .map(
                              (t) =>
                                  `<li ${INSIGHTS_CARD_LINE_DATA_ATTR}>${escapeHtml(t.name)}${t.quantity > 1 ? ` ×${t.quantity}` : ''}</li>`,
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

/**
 * Synchronise l’onglet Suggestions (header) + page tableaux avec le deck courant.
 * (Nom historique `refreshDeckInsightsPanel` conservé pour stats.ts.)
 */
export function refreshInsightsUI(): void {
    const insights = collectDeckInsights(getDeckState());
    const tab = document.querySelector<HTMLElement>(INSIGHTS_NAV_TAB_SELECTOR);
    const summaryBody = document.querySelector(INSIGHTS_SUMMARY_TBODY_SELECTOR);

    if (!tab || !summaryBody) return;

    if (insights.length === 0) {
        tab.hidden = true;
        tab.setAttribute('aria-hidden', 'true');
        const active = document.querySelector(APP_TAB_ACTIVE_SELECTOR)?.getAttribute(TAB_DATA_ATTR);
        if (active === TAB_ID_SUGGESTIONS) setActiveTab(TAB_ID_BUILDER);
        summaryBody.innerHTML = '';
        const detailBody = document.querySelector(INSIGHTS_DETAIL_TBODY_SELECTOR);
        const detailWrap = document.querySelector<HTMLElement>(SUGGESTIONS_DETAIL_WRAP_SELECTOR);
        if (detailBody) detailBody.innerHTML = '';
        if (detailWrap) detailWrap.hidden = true;
        const helpEl = document.querySelector<HTMLElement>(INSIGHTS_PAGE_HELP_SELECTOR);
        if (helpEl) helpEl.textContent = '';
        const numberWrap = document.querySelector<HTMLElement>(SUGGESTIONS_NUMBER_WRAP_SELECTOR);
        const numberBody = document.querySelector(INSIGHTS_NUMBER_TBODY_SELECTOR);
        if (numberWrap) numberWrap.hidden = true;
        if (numberBody) numberBody.innerHTML = '';
        return;
    }

    tab.hidden = false;
    tab.setAttribute('aria-hidden', 'false');
    summaryBody.innerHTML = renderSummaryRows(insights);

    const stInsight = insights.find((i) => i.kind === 'seventh_tachyon');
    const stDetails = stInsight?.details?.seventhTachyon;
    const groups = stDetails?.xyzGroups ?? [];
    const suggested = stDetails?.suggestedNumberXyz;
    const detailBody = document.querySelector(INSIGHTS_DETAIL_TBODY_SELECTOR);
    const detailWrap = document.querySelector<HTMLElement>(SUGGESTIONS_DETAIL_WRAP_SELECTOR);
    const numberWrap = document.querySelector<HTMLElement>(SUGGESTIONS_NUMBER_WRAP_SELECTOR);
    const numberBody = document.querySelector(INSIGHTS_NUMBER_TBODY_SELECTOR);

    if (numberWrap && numberBody) {
        if (suggested && suggested.length > 0) {
            numberWrap.hidden = false;
            numberBody.innerHTML = renderNumberSuggestionRows(suggested);
        } else {
            numberWrap.hidden = true;
            numberBody.innerHTML = '';
        }
    }

    if (detailBody && detailWrap) {
        if (groups.length > 0) {
            detailWrap.hidden = false;
            detailBody.innerHTML = renderDetailRows(stInsight);
        } else {
            detailWrap.hidden = true;
            detailBody.innerHTML = '';
        }
    }

    const help = stInsight?.details?.helpLine ?? insights[0]?.details?.helpLine ?? '';
    const helpEl = document.querySelector<HTMLElement>(INSIGHTS_PAGE_HELP_SELECTOR);
    if (helpEl) helpEl.textContent = help;
}

/** @deprecated alias — utiliser `refreshInsightsUI` ; conservé pour imports existants. */
export const refreshDeckInsightsPanel = refreshInsightsUI;
