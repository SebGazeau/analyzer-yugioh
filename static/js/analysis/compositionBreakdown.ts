/**
 * Répartition Main Deck : monstres / magies / pièges (logique + fragments HTML).
 */

import { escapeHtml } from '../utils/html.js';
import { cardTypeKindFromTypeStringOrNull } from '../utils/cardTypeKind.js';

export interface CompositionBreakdown {
    monsters: {
        byAttribute: Record<string, number>;
        byLevel: Record<string, number>;
        byRace: Record<string, number>;
    };
    spells: { byRace: Record<string, number> };
    traps: { byRace: Record<string, number> };
}

/** Champs minimaux lus depuis une ligne Main Deck. */
export interface CompositionBreakdownRow {
    type?: string;
    quantity: number;
    attribute?: string;
    level?: number | null;
    race?: string;
}

export function computeCompositionBreakdown(main: CompositionBreakdownRow[]): CompositionBreakdown {
    const monsters = {
        byAttribute: {} as Record<string, number>,
        byLevel: {} as Record<string, number>,
        byRace: {} as Record<string, number>,
    };
    const spells = { byRace: {} as Record<string, number> };
    const traps = { byRace: {} as Record<string, number> };

    main.forEach((row) => {
        const kind = cardTypeKindFromTypeStringOrNull(row.type);
        if (kind === null) return;
        const qty = row.quantity;
        const key = (v: string) => v || '—';
        if (kind === 'monster') {
            const attr = key(row.attribute ?? '');
            monsters.byAttribute[attr] = (monsters.byAttribute[attr] || 0) + qty;
            const lvl = row.level != null ? `Niveau ${row.level}` : '—';
            monsters.byLevel[lvl] = (monsters.byLevel[lvl] || 0) + qty;
            const race = key(row.race ?? '');
            monsters.byRace[race] = (monsters.byRace[race] || 0) + qty;
        } else if (kind === 'spell') {
            const race = key(row.race ?? '');
            spells.byRace[race] = (spells.byRace[race] || 0) + qty;
        } else {
            const race = key(row.race ?? '');
            traps.byRace[race] = (traps.byRace[race] || 0) + qty;
        }
    });

    return { monsters, spells, traps };
}

function renderBreakdownList(counts: Record<string, number>, total: number): string {
    const entries = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '<p class="builder-composition-detail-empty">Aucun détail</p>';
    const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(0) : '0');
    return entries
        .map(
            ([label, n]) =>
                `<div class="builder-composition-detail-row"><span class="builder-composition-detail-label">${escapeHtml(label)}</span><span class="builder-composition-detail-count">${n}</span><span class="builder-composition-detail-pct">${pct(n)}%</span></div>`,
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
            '<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Attribut</div>' +
                renderBreakdownList(breakdown.monsters.byAttribute, totalMonsters) +
                '</div>',
        );
    }
    if (Object.keys(breakdown.monsters.byLevel).length) {
        parts.push(
            '<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Niveau / Rang</div>' +
                renderBreakdownList(breakdown.monsters.byLevel, totalMonsters) +
                '</div>',
        );
    }
    if (Object.keys(breakdown.monsters.byRace).length) {
        parts.push(
            '<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Type (race)</div>' +
                renderBreakdownList(breakdown.monsters.byRace, totalMonsters) +
                '</div>',
        );
    }
    const monsterDetail = parts.length
        ? parts.join('')
        : '<p class="builder-composition-detail-empty">Aucun monstre dans le Main</p>';

    const spellDetail =
        totalSpells > 0
            ? '<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Sous-type</div>' +
              renderBreakdownList(breakdown.spells.byRace, totalSpells) +
              '</div>'
            : '<p class="builder-composition-detail-empty">Aucune magie dans le Main</p>';

    const trapDetail =
        totalTraps > 0
            ? '<div class="builder-composition-detail-group"><div class="builder-composition-detail-group-title">Sous-type</div>' +
              renderBreakdownList(breakdown.traps.byRace, totalTraps) +
              '</div>'
            : '<p class="builder-composition-detail-empty">Aucun piège dans le Main</p>';

    return { monsterDetail, spellDetail, trapDetail };
}
