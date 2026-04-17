/**
 * Encart GET `/insights/fidraulis/aggregate` (dédup Extra courant, groupes par contexte, pastilles popularité).
 */
import { getDeckState } from '../deck.js';
import {
    fidraulisAggregateStatsContextLabel,
    fidraulisAggregateStatsContextTitle,
    getFidraulisGyVerifiedEntry,
} from './fidraulisGyAllowlist.js';
import {
    INSIGHT_FIDRAULIS_AGGREGATE_GROUP_DISPLAY_CAUTION,
    INSIGHT_FIDRAULIS_AGGREGATE_SECTION_DESC,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_PARENT_TITLE,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_PARENT_TITLE_LONG,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_FALLBACK,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_MIXED,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_VERIFIED,
    INSIGHT_FIDRAULIS_GY_TRUST_HEURISTIC_LABEL,
    INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL,
} from './fidraulisGyCopy.js';
import { fidraulisAggregateLitPopDots, fidraulisAggregatePopDotLow } from './fidraulisAggregatePopularity.js';
import {
    FIDRAULIS_AGGREGATE_HEAD_META_SELECTOR,
    INSIGHTS_FIND_CARD_BUTTON_CLASS,
    INSIGHTS_FIND_CARD_DATA_ATTR,
} from './insightsDomSelectors.js';
import {
    INSIGHTS_FIND_CARD_BUTTON_LABEL,
    INSIGHTS_FIND_CARD_BUTTON_TITLE,
} from './insightsSuggestionsUiCopy.js';
import { BTN_TYPE_ATTR, BTN_TYPE_BUTTON, TITLE_ATTR } from '../utils/htmlAttrs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';

const WRAP_SELECTOR = '[data-fidraulis-aggregate-wrap]';
const TBODY_SELECTOR = '[data-fidraulis-aggregate-tbody]';
const STATUS_SELECTOR = '[data-fidraulis-aggregate-status]';
const SECTION_DESC_SELECTOR = '[data-fidraulis-aggregate-section-desc]';

type AggregateItem = {
    passcode: number;
    name: string;
    community_score: number;
    cooccurrence_extra_with_fid: number;
    synergy_verified_pass: number;
    synergy_heuristic_pass: number;
};

type AggregateResponse = {
    items: AggregateItem[];
    next_offset: number | null;
    rule_version: number;
};

type AggregateGroup = {
    rawLabel: string;
    displayLabel: string;
    items: AggregateItem[];
};

function aggregateContextKey(it: AggregateItem): string {
    return fidraulisAggregateStatsContextLabel(
        it.passcode,
        it.synergy_verified_pass,
        it.synergy_heuristic_pass,
    );
}

function isStatsOnlyAggregateLabel(raw: string): boolean {
    return (
        raw === INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION ||
        raw === INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_VERIFIED ||
        raw === INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_MIXED ||
        raw === INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_FALLBACK
    );
}

function extraPasscodesInDeck(): Set<number> {
    const s = getDeckState();
    const set = new Set<number>();
    for (const r of s.extra) {
        if (r.quantity > 0 && typeof r.cardId === 'number' && r.cardId > 0) {
            set.add(r.cardId);
        }
    }
    return set;
}

function telemetryOff(): boolean {
    if (typeof document === 'undefined') return true;
    return document.body?.dataset.fidraulisTelemetry === 'off';
}

function groupItemsByContextLabel(items: AggregateItem[]): AggregateGroup[] {
    const m = new Map<string, AggregateItem[]>();
    for (const it of items) {
        const raw = aggregateContextKey(it);
        const arr = m.get(raw);
        if (arr) arr.push(it);
        else m.set(raw, [it]);
    }
    return [...m.entries()].map(([rawLabel, groupItems]) => {
        const sorted = [...groupItems].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        const displayLabel =
            rawLabel === INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION
                ? INSIGHT_FIDRAULIS_AGGREGATE_GROUP_DISPLAY_CAUTION
                : rawLabel;
        return { rawLabel, displayLabel, items: sorted };
    });
}

function sortTaxonomyAggregateGroups(groups: AggregateGroup[]): AggregateGroup[] {
    return [...groups].sort((a, b) => a.displayLabel.localeCompare(b.displayLabel, 'fr'));
}

const STATS_SEGMENT_ORDER: readonly string[] = [
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_VERIFIED,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_MIXED,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_FALLBACK,
    INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION,
] as const;

function orderStatsSubgroups(groups: AggregateGroup[]): AggregateGroup[] {
    const byRaw = new Map(groups.map((g) => [g.rawLabel, g]));
    return STATS_SEGMENT_ORDER.map((r) => byRaw.get(r)).filter((g): g is AggregateGroup => g != null && g.items.length > 0);
}

function aggregateCtxIconForTaxonomyGroup(group: AggregateGroup): string {
    const first = group.items[0];
    if (!first) return '🔍';
    const entry = getFidraulisGyVerifiedEntry(first.passcode);
    if (entry) {
        if (entry.taxon === 'effect_on_sent_to_gy') return '💀';
        if (entry.taxon === 'field_or_gy_continuous') return '⚡';
        return '🔍';
    }
    const raw = group.rawLabel;
    if (raw.includes('Terrain') || (raw.includes('Cimetière') && raw.includes('Actif'))) return '⚡';
    return '💀';
}

function aggregateStatsSubsectionIcon(rawLabel: string): string {
    if (rawLabel === INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION) return '🔍';
    return '💀';
}

function aggregateStatsSubsectionClass(rawLabel: string): string {
    const base = 'suggestions-fidraulis-agg-stats-subhead';
    if (rawLabel === INSIGHT_FIDRAULIS_AGGREGATE_STATS_GROUP_CAUTION) {
        return `${base} suggestions-fidraulis-agg-stats-subhead--caution`;
    }
    return base;
}

/** Libellé heuristique sur une ligne : mot court si le compteur est grand. */
function aggregateHeuristicTrustLabel(heuristicPass: number): string {
    if (heuristicPass <= 0) return INSIGHT_FIDRAULIS_GY_TRUST_HEURISTIC_LABEL;
    const word = heuristicPass >= 10 ? 'Heur.' : INSIGHT_FIDRAULIS_GY_TRUST_HEURISTIC_LABEL;
    return `${word}\u00a0×${heuristicPass}`;
}

function aggregateTrustHtml(it: AggregateItem): string {
    const agg = 'suggestions-trust-badge--aggregate';
    if (getFidraulisGyVerifiedEntry(it.passcode)) {
        return `<span class="suggestions-trust-badge suggestions-trust-badge--verified ${agg}">${escapeHtml(INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL)}</span>`;
    }
    const { synergy_verified_pass: sv, synergy_heuristic_pass: sh } = it;
    if (sv > sh) {
        return `<span class="suggestions-trust-badge suggestions-trust-badge--verified ${agg}">${escapeHtml(INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL)}</span>`;
    }
    if (sh > sv) {
        return `<span class="suggestions-trust-badge suggestions-trust-badge--heuristic ${agg}">${escapeHtml(aggregateHeuristicTrustLabel(sh))}</span>`;
    }
    return sv >= sh
        ? `<span class="suggestions-trust-badge suggestions-trust-badge--verified ${agg}">${escapeHtml(INSIGHT_FIDRAULIS_GY_TRUST_VERIFIED_LABEL)}</span>`
        : `<span class="suggestions-trust-badge suggestions-trust-badge--heuristic ${agg}">${escapeHtml(aggregateHeuristicTrustLabel(sh))}</span>`;
}

function aggregatePopDotsHtml(
    lit: number,
    dotLow: boolean,
    communityScore: number,
    sv: number,
    sh: number,
): string {
    const aria = `Popularité ${lit} sur 5 (score ${communityScore}, stats ${sv} vérifié / ${sh} heuristique)`;
    const bits: string[] = [];
    for (let i = 1; i <= 5; i++) {
        const on = i <= lit;
        let cls = 'suggestions-pop-dot';
        if (on) {
            cls += i === 1 && dotLow ? ' suggestions-pop-dot--on-low' : ' suggestions-pop-dot--on';
        }
        bits.push(`<span class="${cls}"></span>`);
    }
    return `<div class="suggestions-pop-dots" role="img" aria-label="${escapeAttr(aria)}">${bits.join('')}</div>`;
}

function aggregateCardRowsHtml(items: AggregateItem[], scores: readonly number[]): string {
    return items
        .map((it) => {
            const nameAttr = escapeAttr(it.name);
            const lit = fidraulisAggregateLitPopDots(it.community_score, scores);
            const dotLow = fidraulisAggregatePopDotLow(lit, it.synergy_verified_pass, it.synergy_heuristic_pass);
            const ctxTitle = fidraulisAggregateStatsContextTitle(
                it.passcode,
                it.synergy_verified_pass,
                it.synergy_heuristic_pass,
            );
            const titleRow =
                `Passcode ${it.passcode} · score ${it.community_score} · ${it.synergy_verified_pass} vérifié / ${it.synergy_heuristic_pass} heuristique` +
                (ctxTitle.trim().length > 0 ? ` — ${ctxTitle}` : '');
            return `
      <div class="suggestions-fidraulis-card-row suggestions-fidraulis-aggregate-card-row" ${TITLE_ATTR}="${escapeAttr(titleRow)}">
        <div class="suggestions-fidraulis-card-main">
          <div class="suggestions-fidraulis-card-name">${escapeHtml(it.name)}</div>
          <div class="suggestions-fidraulis-card-sub">${it.passcode}</div>
        </div>
        <div class="suggestions-score-cell">
          <div class="suggestions-score-badge-slot">${aggregateTrustHtml(it)}</div>
          ${aggregatePopDotsHtml(lit, dotLow, it.community_score, it.synergy_verified_pass, it.synergy_heuristic_pass)}
        </div>
        <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${INSIGHTS_FIND_CARD_BUTTON_CLASS} suggestions-aggregate-find-card suggestions-fidraulis-btn-search" ${INSIGHTS_FIND_CARD_DATA_ATTR}="${nameAttr}" ${TITLE_ATTR}="${INSIGHTS_FIND_CARD_BUTTON_TITLE}">${INSIGHTS_FIND_CARD_BUTTON_LABEL}</button>
      </div>`;
        })
        .join('');
}

function renderAggregateStatsParentBlock(segments: AggregateGroup[], scores: readonly number[]): string {
    const total = segments.reduce((n, g) => n + g.items.length, 0);
    const titleId = 'fidraulis-agg-stats-parent';
    const body = segments
        .map((seg) => {
            if (seg.rawLabel === INSIGHT_FIDRAULIS_AGGREGATE_STATS_RAW_VERIFIED) {
                return aggregateCardRowsHtml(seg.items, scores);
            }
            const subCls = aggregateStatsSubsectionClass(seg.rawLabel);
            const icon = aggregateStatsSubsectionIcon(seg.rawLabel);
            const first = seg.items[0];
            const subTitleLong =
                first != null
                    ? fidraulisAggregateStatsContextTitle(
                          first.passcode,
                          first.synergy_verified_pass,
                          first.synergy_heuristic_pass,
                      )
                    : '';
            return `
    <div class="${subCls}" role="separator" aria-label="${escapeAttr(seg.displayLabel)}">
      <span class="suggestions-fidraulis-agg-stats-subhead-icon" aria-hidden="true">${icon}</span>
      <span class="suggestions-fidraulis-agg-stats-subhead-label" ${TITLE_ATTR}="${escapeAttr(subTitleLong)}">${escapeHtml(seg.displayLabel)}</span>
    </div>
    ${aggregateCardRowsHtml(seg.items, scores)}`;
        })
        .join('');
    return `
    <div class="suggestions-fidraulis-ctx-group suggestions-fidraulis-agg-stats-root" role="region" aria-labelledby="${titleId}">
      <div class="suggestions-fidraulis-ctx-header suggestions-fidraulis-ctx-header--stats-parent">
        <span class="suggestions-fidraulis-ctx-icon" aria-hidden="true">💀</span>
        <span class="suggestions-fidraulis-ctx-title" id="${titleId}" ${TITLE_ATTR}="${escapeAttr(INSIGHT_FIDRAULIS_AGGREGATE_STATS_PARENT_TITLE_LONG)}">${escapeHtml(INSIGHT_FIDRAULIS_AGGREGATE_STATS_PARENT_TITLE)}</span>
        <span class="suggestions-fidraulis-ctx-badge">${escapeHtml(total === 1 ? '1 carte' : `${total} cartes`)}</span>
      </div>
      ${body}
    </div>`;
}

export async function loadFidraulisAggregateEncart(): Promise<void> {
    if (telemetryOff()) return;

    const wrap = document.querySelector<HTMLElement>(WRAP_SELECTOR);
    const list = document.querySelector<HTMLElement>(TBODY_SELECTOR);
    const statusEl = document.querySelector<HTMLElement>(STATUS_SELECTOR);
    const sectionDesc = document.querySelector<HTMLElement>(SECTION_DESC_SELECTOR);
    const headMeta = document.querySelector<HTMLElement>(FIDRAULIS_AGGREGATE_HEAD_META_SELECTOR);
    if (!wrap || !list) return;

    wrap.hidden = false;
    if (statusEl) statusEl.textContent = 'Chargement…';
    if (sectionDesc) sectionDesc.textContent = '';
    if (headMeta) headMeta.textContent = '';

    try {
        const res = await fetch('/insights/fidraulis/aggregate?limit=30&offset=0', {
            credentials: 'same-origin',
        });
        if (res.status === 404) {
            wrap.hidden = true;
            list.innerHTML = '';
            return;
        }
        if (!res.ok) {
            if (statusEl) statusEl.textContent = 'Indisponible.';
            list.innerHTML = '';
            if (sectionDesc) sectionDesc.textContent = '';
            if (headMeta) headMeta.textContent = '';
            return;
        }
        const data = (await res.json()) as AggregateResponse;
        const inExtra = extraPasscodesInDeck();
        const filtered = data.items.filter((it) => !inExtra.has(it.passcode));

        if (filtered.length === 0) {
            list.innerHTML = '';
            if (sectionDesc) sectionDesc.textContent = '';
            if (headMeta) headMeta.textContent = '';
            if (statusEl) {
                statusEl.textContent =
                    'Aucune proposition hors Extra pour l’instant (stats agrégées ou deck déjà à jour).';
            }
            return;
        }

        if (statusEl) {
            statusEl.textContent =
                'Cartes souvent associées à Fidraulis (scores agrégés ; pas un conseil officiel Konami).';
        }
        if (sectionDesc) sectionDesc.textContent = INSIGHT_FIDRAULIS_AGGREGATE_SECTION_DESC;
        if (headMeta) {
            headMeta.textContent = filtered.length === 1 ? '1 carte' : `${filtered.length} cartes`;
        }

        const scores = filtered.map((i) => i.community_score);
        const allGroups = groupItemsByContextLabel(filtered);
        const taxonomyGroups = sortTaxonomyAggregateGroups(
            allGroups.filter((g) => !isStatsOnlyAggregateLabel(g.rawLabel)),
        );
        const statsSubgroups = orderStatsSubgroups(
            allGroups.filter((g) => isStatsOnlyAggregateLabel(g.rawLabel)),
        );

        const taxonomyHtml = taxonomyGroups
            .map((g, idx) => {
                const titleLong =
                    g.items[0] != null
                        ? fidraulisAggregateStatsContextTitle(
                              g.items[0].passcode,
                              g.items[0].synergy_verified_pass,
                              g.items[0].synergy_heuristic_pass,
                          )
                        : '';
                const titleId = `fidraulis-agg-${idx}`;
                const icon = aggregateCtxIconForTaxonomyGroup(g);
                const n = g.items.length;
                const badge = n === 1 ? '1 carte' : `${n} cartes`;
                return `
    <div class="suggestions-fidraulis-ctx-group" role="group" aria-labelledby="${titleId}">
      <div class="suggestions-fidraulis-ctx-header">
        <span class="suggestions-fidraulis-ctx-icon" aria-hidden="true">${icon}</span>
        <span class="suggestions-fidraulis-ctx-title" id="${titleId}" ${TITLE_ATTR}="${escapeAttr(titleLong)}">${escapeHtml(g.displayLabel)}</span>
        <span class="suggestions-fidraulis-ctx-badge">${escapeHtml(badge)}</span>
      </div>
      ${aggregateCardRowsHtml(g.items, scores)}
    </div>`;
            })
            .join('');

        const statsHtml =
            statsSubgroups.length > 0 ? renderAggregateStatsParentBlock(statsSubgroups, scores) : '';

        list.innerHTML = `${taxonomyHtml}${statsHtml}`;
    } catch {
        if (statusEl) statusEl.textContent = 'Erreur réseau.';
        list.innerHTML = '';
        if (sectionDesc) sectionDesc.textContent = '';
        if (headMeta) headMeta.textContent = '';
    }
}
