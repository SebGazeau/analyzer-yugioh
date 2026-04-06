/**
 * HTML des panneaux de détail composition Main (stats / builder).
 */

import type { CompositionBreakdown } from './compositionBreakdown.js';
import {
    COMPOSITION_BREAKDOWN_DETAIL_EMPTY_LIST,
    COMPOSITION_BREAKDOWN_EMPTY_MONSTERS_MAIN,
    COMPOSITION_BREAKDOWN_EMPTY_SPELLS_MAIN,
    COMPOSITION_BREAKDOWN_EMPTY_TRAPS_MAIN,
    COMPOSITION_BREAKDOWN_GROUP_TITLE_ATTRIBUTE,
    COMPOSITION_BREAKDOWN_GROUP_TITLE_LEVEL_RANK,
    COMPOSITION_BREAKDOWN_GROUP_TITLE_RACE,
    COMPOSITION_BREAKDOWN_GROUP_TITLE_SUBTYPE,
} from './compositionBreakdownCopy.js';
import {
    BUILDER_COMPOSITION_DETAIL_COUNT_CLASS,
    BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS,
    BUILDER_COMPOSITION_DETAIL_GROUP_CLASS,
    BUILDER_COMPOSITION_DETAIL_GROUP_TITLE_CLASS,
    BUILDER_COMPOSITION_DETAIL_LABEL_CLASS,
    BUILDER_COMPOSITION_DETAIL_PCT_CLASS,
    BUILDER_COMPOSITION_DETAIL_ROW_CLASS,
} from './compositionBreakdownDomSelectors.js';
import { escapeHtml } from '../utils/html.js';

function renderBreakdownList(counts: Record<string, number>, total: number): string {
    const entries = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
        return `<p class="${BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS}">${COMPOSITION_BREAKDOWN_DETAIL_EMPTY_LIST}</p>`;
    }
    const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(0) : '0');
    return entries
        .map(
            ([label, n]) =>
                `<div class="${BUILDER_COMPOSITION_DETAIL_ROW_CLASS}"><span class="${BUILDER_COMPOSITION_DETAIL_LABEL_CLASS}">${escapeHtml(label)}</span><span class="${BUILDER_COMPOSITION_DETAIL_COUNT_CLASS}">${n}</span><span class="${BUILDER_COMPOSITION_DETAIL_PCT_CLASS}">${pct(n)}%</span></div>`,
        )
        .join('');
}

export function buildCompositionDetailPanelsHtml(breakdown: CompositionBreakdown): {
    monsterDetail: string;
    spellDetail: string;
    trapDetail: string;
} {
    const totalMonsters = Object.values(breakdown.monsters.byAttribute).reduce((a, b) => a + b, 0);
    const totalSpells = Object.values(breakdown.spells.byRace).reduce((a, b) => a + b, 0);
    const totalTraps = Object.values(breakdown.traps.byRace).reduce((a, b) => a + b, 0);

    const parts: string[] = [];
    if (Object.keys(breakdown.monsters.byAttribute).length) {
        parts.push(
            `<div class="${BUILDER_COMPOSITION_DETAIL_GROUP_CLASS}"><div class="${BUILDER_COMPOSITION_DETAIL_GROUP_TITLE_CLASS}">${COMPOSITION_BREAKDOWN_GROUP_TITLE_ATTRIBUTE}</div>` +
                renderBreakdownList(breakdown.monsters.byAttribute, totalMonsters) +
                '</div>',
        );
    }
    if (Object.keys(breakdown.monsters.byLevel).length) {
        parts.push(
            `<div class="${BUILDER_COMPOSITION_DETAIL_GROUP_CLASS}"><div class="${BUILDER_COMPOSITION_DETAIL_GROUP_TITLE_CLASS}">${COMPOSITION_BREAKDOWN_GROUP_TITLE_LEVEL_RANK}</div>` +
                renderBreakdownList(breakdown.monsters.byLevel, totalMonsters) +
                '</div>',
        );
    }
    if (Object.keys(breakdown.monsters.byRace).length) {
        parts.push(
            `<div class="${BUILDER_COMPOSITION_DETAIL_GROUP_CLASS}"><div class="${BUILDER_COMPOSITION_DETAIL_GROUP_TITLE_CLASS}">${COMPOSITION_BREAKDOWN_GROUP_TITLE_RACE}</div>` +
                renderBreakdownList(breakdown.monsters.byRace, totalMonsters) +
                '</div>',
        );
    }
    const monsterDetail = parts.length
        ? parts.join('')
        : `<p class="${BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS}">${COMPOSITION_BREAKDOWN_EMPTY_MONSTERS_MAIN}</p>`;

    const spellDetail =
        totalSpells > 0
            ? `<div class="${BUILDER_COMPOSITION_DETAIL_GROUP_CLASS}"><div class="${BUILDER_COMPOSITION_DETAIL_GROUP_TITLE_CLASS}">${COMPOSITION_BREAKDOWN_GROUP_TITLE_SUBTYPE}</div>` +
              renderBreakdownList(breakdown.spells.byRace, totalSpells) +
              '</div>'
            : `<p class="${BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS}">${COMPOSITION_BREAKDOWN_EMPTY_SPELLS_MAIN}</p>`;

    const trapDetail =
        totalTraps > 0
            ? `<div class="${BUILDER_COMPOSITION_DETAIL_GROUP_CLASS}"><div class="${BUILDER_COMPOSITION_DETAIL_GROUP_TITLE_CLASS}">${COMPOSITION_BREAKDOWN_GROUP_TITLE_SUBTYPE}</div>` +
              renderBreakdownList(breakdown.traps.byRace, totalTraps) +
              '</div>'
            : `<p class="${BUILDER_COMPOSITION_DETAIL_EMPTY_CLASS}">${COMPOSITION_BREAKDOWN_EMPTY_TRAPS_MAIN}</p>`;

    return { monsterDetail, spellDetail, trapDetail };
}
