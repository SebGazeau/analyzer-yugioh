/**
 * HTML des blocs Fidraulis (Synchros ressource) — regroupement par taxon, aligné maquette v3.
 */
import {
    INSIGHTS_DETAIL_ROW_DATA_ATTR,
    INSIGHTS_EMPTY_CELL_DATA_ATTR,
    INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR,
    INSIGHTS_FIDRAULIS_TRUST_DATA_ATTR,
    INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR,
    INSIGHTS_FIDRAULIS_VOTE_CELL_DATA_ATTR,
    INSIGHTS_KIND_DATA_ATTR,
} from './insightsDomSelectors.js';
import {
    INSIGHT_FIDRAULIS_GY_SUBSECTION_HEURISTIC,
    INSIGHT_FIDRAULIS_GY_TRUST_HEURISTIC_LABEL,
    INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL,
    INSIGHT_FIDRAULIS_GY_VOTE_LOGIN_PROMPT,
    INSIGHT_FIDRAULIS_GY_VOTE_NO_LABEL,
    INSIGHT_FIDRAULIS_GY_VOTE_YES_LABEL,
} from './fidraulisGyCopy.js';
import { fidraulisGyTaxonLabelFr } from './fidraulisGyTaxonomy.js';
import type { FidraulisGyResourceRow, FidraulisGyResourceTaxon } from './types.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON, TITLE_ATTR } from '../utils/htmlAttrs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';

const TAXON_GROUP_ORDER: FidraulisGyResourceTaxon[] = [
    'effect_on_sent_to_gy',
    'field_or_gy_continuous',
    'effect_if_in_gy',
    'extra_synchro_to_gy_fid_cost',
    'discard_cost',
    'other_documented',
    'heuristic_uncertain',
];

function taxonSortIndex(t: FidraulisGyResourceTaxon): number {
    const i = TAXON_GROUP_ORDER.indexOf(t);
    return i === -1 ? TAXON_GROUP_ORDER.length : i;
}

function ctxIconForTaxon(taxon: FidraulisGyResourceTaxon): string {
    if (taxon === 'effect_on_sent_to_gy') return '💀';
    if (taxon === 'field_or_gy_continuous') return '⚡';
    return '🔍';
}

function groupRowsByTaxon(rows: FidraulisGyResourceRow[]): Map<FidraulisGyResourceTaxon, FidraulisGyResourceRow[]> {
    const m = new Map<FidraulisGyResourceTaxon, FidraulisGyResourceRow[]>();
    for (const r of rows) {
        const arr = m.get(r.resourceTaxon);
        if (arr) arr.push(r);
        else m.set(r.resourceTaxon, [r]);
    }
    for (const arr of m.values()) {
        arr.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    return m;
}

const FIDRAULIS_PILL_VERIFIED = 'suggestions-fidraulis-pill suggestions-fidraulis-pill--verified';
const FIDRAULIS_PILL_HEURISTIC = 'suggestions-fidraulis-pill suggestions-fidraulis-pill--heuristic';

function fidraulisGyTrustPillHtml(trust: FidraulisGyResourceRow['trust']): string {
    const label =
        trust === 'verified' ? INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL : INSIGHT_FIDRAULIS_GY_TRUST_HEURISTIC_LABEL;
    const cls = trust === 'verified' ? FIDRAULIS_PILL_VERIFIED : FIDRAULIS_PILL_HEURISTIC;
    return `<span class="${cls}" ${INSIGHTS_FIDRAULIS_TRUST_DATA_ATTR}="${escapeAttr(trust)}">${escapeHtml(label)}</span>`;
}

function fidraulisGyVoteAvisHtml(r: FidraulisGyResourceRow, siteUserLogged: boolean): string {
    if (r.trust !== 'heuristic' || r.cardId == null || r.cardId <= 0) {
        return `<div class="suggestions-fidraulis-avis"><span ${INSIGHTS_EMPTY_CELL_DATA_ATTR}>—</span></div>`;
    }
    const idAttr = escapeAttr(String(r.cardId));
    if (!siteUserLogged) {
        return `<div class="suggestions-fidraulis-avis"><span class="suggestions-fidraulis-vote-guest">${escapeHtml(INSIGHT_FIDRAULIS_GY_VOTE_LOGIN_PROMPT)}</span></div>`;
    }
    return `<div class="suggestions-fidraulis-avis" ${INSIGHTS_FIDRAULIS_VOTE_CELL_DATA_ATTR}="1" ${INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR}="${idAttr}">
      <div class="suggestions-fidraulis-vote" data-fidraulis-vote-ui="1">
        <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="suggestions-fidraulis-btn-avis suggestions-fidraulis-btn-avis--yes" ${INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR}="approve" ${INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR}="${idAttr}">${escapeHtml(INSIGHT_FIDRAULIS_GY_VOTE_YES_LABEL)}</button>
        <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="suggestions-fidraulis-btn-avis suggestions-fidraulis-btn-avis--no" ${INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR}="reject" ${INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR}="${idAttr}">${escapeHtml(INSIGHT_FIDRAULIS_GY_VOTE_NO_LABEL)}</button>
      </div>
    </div>`;
}

function ctxBadgeText(rows: FidraulisGyResourceRow[]): string {
    const n = rows.length;
    const allHeur = rows.every((x) => x.trust === 'heuristic');
    if (allHeur) {
        return n === 1 ? '1 heuristique' : `${n} heuristiques`;
    }
    return n === 1 ? '1 carte' : `${n} cartes`;
}

function ctxGroupHeaderClass(rows: FidraulisGyResourceRow[]): string {
    const allHeur = rows.every((x) => x.trust === 'heuristic');
    return allHeur ? 'suggestions-fidraulis-ctx-header suggestions-fidraulis-ctx-header--heuristic' : 'suggestions-fidraulis-ctx-header';
}

/** Lignes / groupes Synchros « ressource » Fidraulis (cartes, regroupement par taxon). */
export function insightsFidraulisGyRowsHtml(rows: FidraulisGyResourceRow[], siteUserLogged = false): string {
    const byTaxon = groupRowsByTaxon(rows);
    const taxa = [...byTaxon.keys()].sort((a, b) => taxonSortIndex(a) - taxonSortIndex(b) || a.localeCompare(b));
    return taxa
        .map((taxon) => {
            const groupRows = byTaxon.get(taxon)!;
            const first = groupRows[0]!;
            const titleShort = escapeHtml(first.resourceContextLabel);
            const titleLong =
                first.resourceContextTitle && first.resourceContextTitle.trim().length > 0
                    ? first.resourceContextTitle
                    : fidraulisGyTaxonLabelFr(taxon);
            const titleId = `fidraulis-ctx-${taxon}`;
            const headerCls = ctxGroupHeaderClass(groupRows);
            const sortedInGroup = [...groupRows].sort((a, b) => {
                if (a.trust !== b.trust) return a.trust === 'verified' ? -1 : 1;
                return a.name.localeCompare(b.name, 'fr');
            });
            const hasVerified = sortedInGroup.some((r) => r.trust === 'verified');
            const hasHeuristic = sortedInGroup.some((r) => r.trust === 'heuristic');
            const showHeuristicSubhead = hasVerified && hasHeuristic;
            let heuristicSubheadInserted = false;
            const rowsHtml = sortedInGroup
                .map((r) => {
                    let sub = '';
                    if (showHeuristicSubhead && r.trust === 'heuristic' && !heuristicSubheadInserted) {
                        heuristicSubheadInserted = true;
                        sub = `
    <div class="suggestions-fidraulis-ctx-subhead" role="separator" aria-label="${escapeAttr(INSIGHT_FIDRAULIS_GY_SUBSECTION_HEURISTIC)}">
      <span class="suggestions-fidraulis-ctx-subhead-icon" aria-hidden="true">🔍</span>
      <span class="suggestions-fidraulis-ctx-subhead-label">${escapeHtml(INSIGHT_FIDRAULIS_GY_SUBSECTION_HEURISTIC)}</span>
    </div>`;
                    }
                    const nameEsc = escapeHtml(r.name);
                    const noteHtml =
                        r.note && r.note.trim().length > 0
                            ? `<div class="suggestions-fidraulis-card-sub">${escapeHtml(r.note)}</div>`
                            : '';
                    const rowMod =
                        r.trust === 'heuristic'
                            ? 'suggestions-fidraulis-card-row suggestions-fidraulis-card-row--heuristic'
                            : 'suggestions-fidraulis-card-row';
                    return `${sub}
    <div class="${rowMod}" ${INSIGHTS_DETAIL_ROW_DATA_ATTR} ${INSIGHTS_KIND_DATA_ATTR}="fidraulis_gy_synchro">
      <div class="suggestions-fidraulis-card-main">
        <div class="suggestions-fidraulis-card-name">${nameEsc}</div>${noteHtml}
      </div>
      ${fidraulisGyTrustPillHtml(r.trust)}
      <div class="suggestions-fidraulis-card-qty">${escapeHtml(String(r.quantity))}</div>
      ${fidraulisGyVoteAvisHtml(r, siteUserLogged)}
    </div>`;
                })
                .join('');
            return `
    <div class="suggestions-fidraulis-ctx-group" role="group" aria-labelledby="${titleId}">
      <div class="${headerCls}">
        <span class="suggestions-fidraulis-ctx-icon" aria-hidden="true">${ctxIconForTaxon(taxon)}</span>
        <span class="suggestions-fidraulis-ctx-title" id="${titleId}" ${TITLE_ATTR}="${escapeAttr(titleLong)}">${titleShort}</span>
        <span class="suggestions-fidraulis-ctx-badge">${escapeHtml(ctxBadgeText(groupRows))}</span>
      </div>
      ${rowsHtml}
    </div>`;
        })
        .join('');
}
