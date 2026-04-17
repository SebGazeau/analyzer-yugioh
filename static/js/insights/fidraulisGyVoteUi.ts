/**
 * Votes utilisateur (session site) sur les lignes heuristiques du tableau Fidraulis GY.
 */
import {
    INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR,
    INSIGHTS_FIDRAULIS_TBODY_SELECTOR,
    INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR,
    INSIGHTS_FIDRAULIS_VOTE_CELL_DATA_ATTR,
} from './insightsDomSelectors.js';
import {
    INSIGHT_FIDRAULIS_GY_VOTE_ALREADY,
    INSIGHT_FIDRAULIS_GY_VOTE_THANKS,
} from './fidraulisGyCopy.js';
import { SUGGESTIONS_PANEL_ELEMENT_ID } from '../suggestionsDomIds.js';
import { DOM_EVENT_CLICK } from '../utils/domEventNames.js';

type VoteStateItem = {
    passcode: number;
    admin_locked: boolean;
    user_verdict: string | null;
};

function csrfFromDom(): string | null {
    if (typeof document === 'undefined') return null;
    const t = document.body?.dataset.csrfToken?.trim();
    return t && t.length > 0 ? t : null;
}

function renderVoteCellContent(cell: HTMLElement, item: VoteStateItem): void {
    if (item.admin_locked) {
        cell.innerHTML = '<span class="suggestions-fidraulis-vote-locked">—</span>';
        return;
    }
    if (item.user_verdict === 'approve' || item.user_verdict === 'reject') {
        const label = item.user_verdict === 'approve' ? 'Oui' : 'Non';
        cell.innerHTML = `<span class="suggestions-fidraulis-vote-done">${INSIGHT_FIDRAULIS_GY_VOTE_THANKS} (${label})</span>`;
        return;
    }
    const id = String(item.passcode);
    cell.innerHTML = `<div class="suggestions-fidraulis-vote" data-fidraulis-vote-ui="1">
        <button type="button" class="suggestions-fidraulis-btn-avis suggestions-fidraulis-btn-avis--yes" ${INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR}="approve" ${INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR}="${id}">Oui</button>
        <button type="button" class="suggestions-fidraulis-btn-avis suggestions-fidraulis-btn-avis--no" ${INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR}="reject" ${INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR}="${id}">Non</button>
      </div>`;
}

/** Après rendu du tbody Fidraulis : synchronise boutons / avis déjà enregistrés (utilisateur connecté). */
export async function applyFidraulisGyVoteColumnAfterRender(): Promise<void> {
    if (typeof document === 'undefined') return;
    if (document.body?.dataset.siteUserLogged !== '1') return;
    const tbody = document.querySelector(INSIGHTS_FIDRAULIS_TBODY_SELECTOR);
    if (!tbody) return;
    const cells = tbody.querySelectorAll<HTMLElement>(`[${INSIGHTS_FIDRAULIS_VOTE_CELL_DATA_ATTR}="1"]`);
    if (cells.length === 0) return;
    const passcodes = [...cells]
        .map((c) => parseInt(c.getAttribute(INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR) ?? '', 10))
        .filter((n) => Number.isFinite(n) && n > 0);
    if (passcodes.length === 0) return;
    const qs = passcodes.join(',');
    const res = await fetch(`/insights/fidraulis/gy/vote-state?passcodes=${encodeURIComponent(qs)}`, {
        credentials: 'same-origin',
    });
    if (!res.ok) return;
    const data = (await res.json()) as { items?: VoteStateItem[] };
    const items = data.items ?? [];
    for (const cell of cells) {
        const pc = parseInt(cell.getAttribute(INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR) ?? '', 10);
        const row = items.find((i) => i.passcode === pc);
        if (row) renderVoteCellContent(cell, row);
    }
}

let voteClickBound = false;

export function bindFidraulisGyVoteButtons(): void {
    if (typeof document === 'undefined' || voteClickBound) return;
    voteClickBound = true;
    document.addEventListener(DOM_EVENT_CLICK, (e: Event) => {
        const t = e.target as HTMLElement | null;
        const btn = t?.closest<HTMLButtonElement>(`[${INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR}]`);
        if (!btn || btn.tagName !== 'BUTTON') return;
        const panel = document.getElementById(SUGGESTIONS_PANEL_ELEMENT_ID);
        if (!panel?.contains(btn)) return;
        const verdict = btn.getAttribute(INSIGHTS_FIDRAULIS_VOTE_BTN_DATA_ATTR)?.trim();
        const pcRaw = btn.getAttribute(INSIGHTS_FIDRAULIS_PASSCODE_DATA_ATTR)?.trim();
        if (!verdict || (verdict !== 'approve' && verdict !== 'reject') || !pcRaw) return;
        const passcode = parseInt(pcRaw, 10);
        if (!Number.isFinite(passcode) || passcode <= 0) return;
        e.preventDefault();
        const csrf = csrfFromDom();
        if (!csrf) return;
        const wrap = btn.closest('.suggestions-fidraulis-vote');
        if (wrap) {
            wrap.querySelectorAll('button').forEach((b) => {
                b.disabled = true;
            });
        }
        void (async () => {
            const res = await fetch('/insights/fidraulis/gy/vote', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf,
                },
                body: JSON.stringify({ passcode, verdict }),
            });
            const cell = btn.closest<HTMLElement>(`[${INSIGHTS_FIDRAULIS_VOTE_CELL_DATA_ATTR}]`);
            if (!cell) return;
            if (res.status === 409) {
                cell.innerHTML = `<span class="suggestions-fidraulis-vote-done">${INSIGHT_FIDRAULIS_GY_VOTE_ALREADY}</span>`;
                return;
            }
            if (!res.ok) {
                if (wrap) wrap.querySelectorAll('button').forEach((b) => { b.disabled = false; });
                return;
            }
            renderVoteCellContent(cell, {
                passcode,
                admin_locked: false,
                user_verdict: verdict,
            });
        })();
    });
}
