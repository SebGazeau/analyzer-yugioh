import { getDeckState } from '../deck.js';
import { deckSectionMainSideShortLabel } from '../deckSection.js';
import { collectDeckInsights } from './collect.js';
import {
    INSIGHTS_DETAIL_TBODY_SELECTOR,
    INSIGHTS_NAV_TAB_SELECTOR,
    INSIGHTS_NUMBER_TBODY_SELECTOR,
    INSIGHTS_PAGE_HELP_SELECTOR,
    INSIGHTS_SUMMARY_TBODY_SELECTOR,
    SUGGESTIONS_DETAIL_WRAP_SELECTOR,
    SUGGESTIONS_NUMBER_WRAP_SELECTOR,
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
    <tr data-insights-summary-row data-insights-kind="${escapeHtml(i.kind)}" data-insights-severity="${escapeHtml(i.severity)}">
      <td data-insights-cell="kind">${escapeHtml(kindLabel(i.kind))}</td>
      <td data-insights-cell="severity">${escapeHtml(severityLabel(i.severity))}</td>
      <td data-insights-cell="title">${escapeHtml(i.title)}</td>
      <td data-insights-cell="summary">${escapeHtml(i.summary)}</td>
    </tr>`,
        )
        .join('');
}

function renderMatchChips(cards: MatchingCardPreview[]): string {
    if (cards.length === 0) return '<span data-insights-empty-cell>—</span>';
    return `<div class="suggestions-main-matches" data-insights-main-matches>${cards
        .map((c) => {
            const nameEsc = escapeHtml(c.name);
            const nameAttr = escapeAttr(c.name);
            const qty =
                c.quantity > 1
                    ? `<span class="suggestions-main-match-qty" aria-label="${c.quantity} exemplaires">×${c.quantity}</span>`
                    : '';
            const sectionBadge = `<span class="suggestions-main-match-section" data-insights-section="${c.section}">${escapeHtml(deckSectionMainSideShortLabel(c.section))}</span>`;
            const thumb =
                c.imageUrl && c.imageUrl.trim() !== ''
                    ? `<img class="suggestions-main-match-thumb" src="${escapeAttr(c.imageUrl)}" alt="" width="44" height="64" loading="lazy" data-insights-match-thumb />`
                    : '<span class="suggestions-main-match-thumb suggestions-main-match-thumb--empty" data-insights-match-thumb aria-hidden="true">?</span>';
            return `<div class="suggestions-main-match-chip" data-insights-main-match data-insights-add-deck-card="1" data-insights-card-name="${nameAttr}" data-insights-section="${c.section}" title="Cliquer pour ajouter 1 exemplaire (${deckSectionMainSideShortLabel(c.section)})" role="button" tabindex="0">
        ${thumb}
        <span class="suggestions-main-match-name">${nameEsc}</span>
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
    <tr data-insights-suggest-row data-insights-matches-main="${s.matchesDeck ? 'true' : 'false'}" data-insights-suggest-name="${nameAttr}" title="Cliquer pour ajouter cette carte au deck (Extra si Xyz)">
      <td data-insights-cell="name">${nameEsc}</td>
      <td data-insights-cell="num">${s.numberIndex}</td>
      <td data-insights-cell="rank">${s.rank}</td>
      <td data-insights-cell="attr-race">${attrRace}</td>
      <td data-insights-cell="match">${matchCell}</td>
      <td data-insights-cell="action">
        <button type="button" class="btn btn-deck btn-deck-ghost btn-sm" data-insights-find-card="${nameAttr}" title="Ouvrir le Builder et rechercher cette carte">Chercher</button>
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
                    ? '<span data-insights-empty-cell>—</span>'
                    : `<ul class="suggestions-target-list">${g.targets
                          .map(
                              (t) =>
                                  `<li data-insights-card-line>${escapeHtml(t.name)}${t.quantity > 1 ? ` ×${t.quantity}` : ''}</li>`,
                          )
                          .join('')}</ul>`;
            return `
    <tr data-insights-detail-row>
      <td data-insights-cell="xyz">${escapeHtml(g.xyzName)}</td>
      <td data-insights-cell="num">${g.numberIndex}</td>
      <td data-insights-cell="rank">${g.rank}</td>
      <td data-insights-cell="targets">${targetsHtml}</td>
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
