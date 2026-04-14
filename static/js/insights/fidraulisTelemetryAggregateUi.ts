/**
 * Encart GET `/insights/fidraulis/aggregate` (dédup Extra courant, pagination simple).
 */
import { getDeckState } from '../deck.js';
import { escapeHtml } from '../utils/html.js';

const WRAP_SELECTOR = '[data-fidraulis-aggregate-wrap]';
const TBODY_SELECTOR = '[data-fidraulis-aggregate-tbody]';
const STATUS_SELECTOR = '[data-fidraulis-aggregate-status]';

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

export async function loadFidraulisAggregateEncart(): Promise<void> {
    if (telemetryOff()) return;

    const wrap = document.querySelector<HTMLElement>(WRAP_SELECTOR);
    const tbody = document.querySelector<HTMLElement>(TBODY_SELECTOR);
    const statusEl = document.querySelector<HTMLElement>(STATUS_SELECTOR);
    if (!wrap || !tbody) return;

    wrap.hidden = false;
    if (statusEl) statusEl.textContent = 'Chargement…';

    try {
        const res = await fetch('/insights/fidraulis/aggregate?limit=30&offset=0', {
            credentials: 'same-origin',
        });
        if (res.status === 404) {
            wrap.hidden = true;
            return;
        }
        if (!res.ok) {
            if (statusEl) statusEl.textContent = 'Indisponible.';
            return;
        }
        const data = (await res.json()) as AggregateResponse;
        const inExtra = extraPasscodesInDeck();
        const filtered = data.items.filter((it) => !inExtra.has(it.passcode));

        if (filtered.length === 0) {
            tbody.innerHTML = '';
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

        tbody.innerHTML = filtered
            .map(
                (it) => `
      <tr>
        <td>${escapeHtml(it.name)}</td>
        <td>${it.passcode}</td>
        <td>${it.community_score}</td>
        <td>${it.synergy_verified_pass} / ${it.synergy_heuristic_pass}</td>
      </tr>`,
            )
            .join('');
    } catch {
        if (statusEl) statusEl.textContent = 'Erreur réseau.';
    }
}
