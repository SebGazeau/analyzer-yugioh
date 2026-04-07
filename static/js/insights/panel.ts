import { getDeckState } from '../deck.js';
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
import {
    insightsNumberSuggestionRowsHtml,
    insightsSeventhTachyonDetailRowsHtml,
    insightsSummaryRowsHtml,
} from './insightsPanelTableHtml.js';
import {
    APP_TAB_ACTIVE_SELECTOR,
    setActiveTab,
    TAB_DATA_ATTR,
    TAB_ID_BUILDER,
    TAB_ID_SUGGESTIONS,
} from '../tabs.js';
import { ARIA_HIDDEN_ATTR } from '../utils/ariaAttrs.js';

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
        tab.setAttribute(ARIA_HIDDEN_ATTR, 'true');
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
    tab.setAttribute(ARIA_HIDDEN_ATTR, 'false');
    summaryBody.innerHTML = insightsSummaryRowsHtml(insights);

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
            numberBody.innerHTML = insightsNumberSuggestionRowsHtml(suggested);
        } else {
            numberWrap.hidden = true;
            numberBody.innerHTML = '';
        }
    }

    if (detailBody && detailWrap) {
        if (groups.length > 0) {
            detailWrap.hidden = false;
            detailBody.innerHTML = insightsSeventhTachyonDetailRowsHtml(groups);
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
