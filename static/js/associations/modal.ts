import { parseArchetypesFromField } from './archetype.js';
import { getAssociationCatalog, getQaRelatedCardIds } from './associationFetchCache.js';
import { associationReportToMarkdown, buildAssociationReport, toAssociationCatalog } from './buildReport.js';
import type { AssociationCatalogCard, AssociationGroup, AssociationReport } from './types.js';

const MODAL_ID = 'associations-modal';
const MODAL_TITLE_ID = 'associations-modal-title';
const MODAL_SUBTITLE_ID = 'associations-modal-subtitle';
const MODAL_BODY_ID = 'associations-modal-body';
const MODAL_LOADING_ID = 'associations-modal-loading';
const MODAL_PANEL_ID = 'associations-modal-panel';
const MODAL_LIVE_ID = 'associations-modal-live';
const MODAL_ANCHOR_ART_ID = 'associations-modal-anchor-art';

/** Markdown du dernier rapport affiché (copie presse-papiers). */
let latestAssociationMarkdown = '';
let associationsReturnFocus: HTMLElement | null = null;

function countAssociationStats(groups: AssociationGroup[]): {
    groupsWithCards: number;
    uniqueCardCount: number;
} {
    const groupsWithCards = groups.filter((g) => g.cardIds.length > 0).length;
    const ids = new Set<number>();
    for (const g of groups) {
        for (const id of g.cardIds) ids.add(id);
    }
    return { groupsWithCards, uniqueCardCount: ids.size };
}

function isAllowedImageSrc(url: string): boolean {
    const t = url.trim();
    return t.startsWith('/') || t.startsWith('https://') || t.startsWith('http://');
}

function renderThumbInner(
    imageUrl: string | null | undefined,
    name: string,
    imgClass: string,
    loading: 'eager' | 'lazy',
): string {
    const safeName = escapeHtml(name);
    if (imageUrl && isAllowedImageSrc(imageUrl)) {
        return `<img class="${imgClass}" src="${escapeAttr(imageUrl)}" alt="${safeName}" width="59" height="86" loading="${loading}" decoding="async" />`;
    }
    const initials =
        name
            .replace(/[^a-zA-ZÀ-ÿ0-9]/g, '')
            .slice(0, 2)
            .toUpperCase() || '?';
    return `<div class="associations-modal__thumb-placeholder" aria-hidden="true"><span>${escapeHtml(initials)}</span></div>`;
}

function setAnchorArt(card: AssociationCatalogCard): void {
    const el = document.getElementById(MODAL_ANCHOR_ART_ID);
    if (!el) return;
    const name = card.name_en?.trim() || card.name;
    el.innerHTML = renderThumbInner(card.image_url, name, 'associations-modal__anchor-img', 'eager');
}

function mergeAnchorWithCatalog(
    anchor: AssociationCatalogCard,
    catalog: AssociationCatalogCard[],
): AssociationCatalogCard {
    const row = catalog.find((c) => c.id === anchor.id);
    if (!row) return anchor;
    return {
        ...anchor,
        image_url: row.image_url ?? anchor.image_url ?? null,
    };
}

function announceAssociationsModal(message: string): void {
    const live = document.getElementById(MODAL_LIVE_ID);
    if (!live) return;
    live.textContent = '';
    void live.offsetWidth;
    live.textContent = message;
}

async function copyMarkdownToClipboard(): Promise<void> {
    const text = latestAssociationMarkdown;
    if (!text.trim()) {
        announceAssociationsModal('Rien à copier.');
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        announceAssociationsModal('Rapport copié dans le presse-papiers.');
    } catch {
        announceAssociationsModal('Copie impossible — vérifie les permissions du navigateur.');
    }
}

function ensureModalElements(): {
    overlay: HTMLElement;
    body: HTMLElement;
    loading: HTMLElement;
} | null {
    let overlay = document.getElementById(MODAL_ID) as HTMLElement | null;
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = MODAL_ID;
        overlay.className = 'associations-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', MODAL_TITLE_ID);
        overlay.innerHTML = `
            <div class="associations-modal__backdrop" data-associations-close="1"></div>
            <div class="associations-modal__panel" id="${MODAL_PANEL_ID}" role="document">
                <div id="${MODAL_LIVE_ID}" class="associations-modal__live" aria-live="polite" aria-atomic="true"></div>
                <header class="associations-modal__header">
                    <div class="associations-modal__header-main">
                        <div class="associations-modal__anchor-art" id="${MODAL_ANCHOR_ART_ID}" aria-hidden="true"></div>
                        <div class="associations-modal__header-text">
                            <h2 id="${MODAL_TITLE_ID}" class="associations-modal__title">Cartes associées</h2>
                            <p id="${MODAL_SUBTITLE_ID}" class="associations-modal__subtitle"></p>
                        </div>
                    </div>
                    <button type="button" class="associations-modal__close" data-associations-close="1" aria-label="Fermer">×</button>
                </header>
                <div id="${MODAL_LOADING_ID}" class="associations-modal__loading" hidden>
                    <span class="associations-modal__spinner" aria-hidden="true"></span>
                    <span>Chargement des visuels et du catalogue…</span>
                </div>
                <div id="${MODAL_BODY_ID}" class="associations-modal__body"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('[data-associations-close]')) {
                closeAssociationsModal();
            }
            if ((e.target as HTMLElement).closest('[data-associations-action="copy-markdown"]')) {
                e.preventDefault();
                void copyMarkdownToClipboard();
            }
        });
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !overlay.hidden) closeAssociationsModal();
        });
    }
    const body = document.getElementById(MODAL_BODY_ID) as HTMLElement | null;
    const loading = document.getElementById(MODAL_LOADING_ID) as HTMLElement | null;
    if (!body || !loading) return null;
    return { overlay, body, loading };
}

export function closeAssociationsModal(): void {
    const el = document.getElementById(MODAL_ID);
    if (el) {
        el.hidden = true;
        el.classList.remove('associations-modal--open');
    }
    document.getElementById(MODAL_PANEL_ID)?.removeAttribute('aria-busy');
    if (associationsReturnFocus && typeof associationsReturnFocus.focus === 'function') {
        try {
            associationsReturnFocus.focus();
        } catch {
            /* ignore */
        }
    }
    associationsReturnFocus = null;
}

function renderReportHtml(
    report: AssociationReport,
    catalog: AssociationCatalogCard[],
    anchor: AssociationCatalogCard,
    markdown: string,
): string {
    const idToCard = new Map<number, AssociationCatalogCard>();
    for (const c of catalog) idToCard.set(c.id, c);
    const archParsed = parseArchetypesFromField(anchor.archetype ?? undefined);
    const archLine =
        archParsed.length > 0
            ? archParsed.join(' · ')
            : '— (aucun archétype structuré dans les données)';
    const { groupsWithCards, uniqueCardCount } = countAssociationStats(report.groups);

    const parts: string[] = [];
    parts.push(`<div class="associations-modal__summary" role="status">`);
    parts.push(
        `<span class="associations-modal__stat"><span class="associations-modal__stat-value">${groupsWithCards}</span> angle(s) avec cartes</span>`,
    );
    parts.push(
        `<span class="associations-modal__stat"><span class="associations-modal__stat-value">${uniqueCardCount}</span> carte(s) distincte(s)</span>`,
    );
    parts.push(`</div>`);

    parts.push(`<div class="associations-modal__anchor-meta">`);
    parts.push(`<p class="associations-modal__anchor-label">Ancre — métadonnées</p>`);
    parts.push(
        `<p><strong>Archétype(s) — champ API</strong> : ${escapeHtml(archLine)}</p>`,
    );
    parts.push(
        `<p class="associations-modal__anchor-note">Le groupe « même archétype » repose sur ce champ (souvent YGOProDeck). S’il ne correspond pas au jeu papier, la base importée est en cause — pas la logique de regroupement.</p>`,
    );
    parts.push(`</div>`);

    if (report.groups.length === 0) {
        parts.push(`<div class="associations-modal__empty">`);
        parts.push(`<p class="associations-modal__empty-title">Aucune association détectée</p>`);
        parts.push(
            `<p class="associations-modal__empty-text">Consulte les diagnostics éventuels pour comprendre les angles ignorés (archétype absent, textes vides, etc.).</p>`,
        );
        parts.push(`</div>`);
    }

    parts.push('<div class="associations-modal__acc-list">');
    for (let gi = 0; gi < report.groups.length; gi++) {
        const g = report.groups[gi];
        const openAttr = gi === 0 ? ' open' : '';
        parts.push(
            `<details class="associations-modal__acc"${openAttr} data-association-angle="${escapeAttr(g.angleId)}">`,
        );
        parts.push(`<summary class="associations-modal__acc-summary">`);
        parts.push(`<span class="associations-modal__acc-summary-main">`);
        parts.push(`<span class="associations-modal__acc-title">${escapeHtml(g.displayLabel)}</span>`);
        parts.push(
            `<span class="associations-modal__acc-meta"><span>${escapeHtml(g.linkStrength)}</span> · ${g.cardIds.length} carte(s) · <code>${escapeHtml(g.angleId)}</code></span>`,
        );
        parts.push(`</span>`);
        parts.push(
            `<span class="associations-modal__acc-badge" aria-hidden="true">${g.cardIds.length}</span>`,
        );
        parts.push(`</summary>`);
        parts.push(`<div class="associations-modal__acc-panel">`);
        parts.push('<ul class="associations-modal__tile-grid">');
        for (const id of g.cardIds) {
            const row = idToCard.get(id);
            const nm = row ? row.name_en?.trim() || row.name : `#${id}`;
            const art = renderThumbInner(
                row?.image_url,
                nm,
                'associations-modal__tile-img',
                'lazy',
            );
            parts.push(`<li class="associations-modal__tile" data-card-id="${id}">`);
            parts.push(`<div class="associations-modal__tile-art">${art}</div>`);
            parts.push(`<div class="associations-modal__tile-caption">`);
            parts.push(`<span class="associations-modal__tile-name">${escapeHtml(nm)}</span>`);
            parts.push(`</div></li>`);
        }
        parts.push('</ul></div></details>');
    }
    parts.push('</div>');

    if (report.diagnostics.length > 0) {
        parts.push('<section class="associations-modal__diagnostics"><h3>Diagnostics</h3><ul>');
        for (const d of report.diagnostics) {
            parts.push(
                `<li data-severity="${escapeAttr(d.severity)}"><strong>${escapeHtml(d.code)}</strong> — ${escapeHtml(d.message)}</li>`,
            );
        }
        parts.push('</ul></section>');
    }

    parts.push(`<div class="associations-modal__footer">`);
    parts.push(
        `<button type="button" class="associations-modal__btn" data-associations-action="copy-markdown">Copier le rapport (Markdown)</button>`,
    );
    parts.push(
        `<details class="associations-modal__raw"><summary>Aperçu Markdown</summary><pre class="associations-modal__pre">${escapeHtml(
            markdown,
        )}</pre></details>`,
    );
    parts.push(`</div>`);

    return parts.join('');
}

function escapeHtml(s: string): string {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Ouvre la modal : charge `/associations/catalog`, calcule le rapport pour l’ancre (carte recherche).
 */
export async function openAssociatedCardsModal(anchorRaw: Record<string, unknown>): Promise<void> {
    const els = ensureModalElements();
    if (!els) return;
    const anchorList = toAssociationCatalog([anchorRaw]);
    const anchor = anchorList[0];
    if (!anchor) return;

    associationsReturnFocus = document.activeElement as HTMLElement | null;

    els.overlay.hidden = false;
    els.overlay.classList.add('associations-modal--open');
    els.loading.hidden = false;
    els.body.innerHTML = '';
    const title = document.getElementById(MODAL_TITLE_ID);
    if (title) title.textContent = `Cartes associées`;
    const subtitle = document.getElementById(MODAL_SUBTITLE_ID);
    if (subtitle) {
        const displayName = anchor.name_en?.trim() || anchor.name;
        subtitle.textContent = `${displayName} · passcode ${anchor.id}`;
    }
    setAnchorArt(anchor);

    const panel = document.getElementById(MODAL_PANEL_ID);
    panel?.setAttribute('aria-busy', 'true');

    try {
        const [catalog, ygorgQaRelatedCardIds] = await Promise.all([
            getAssociationCatalog(),
            getQaRelatedCardIds(anchor.id),
        ]);
        const displayAnchor = mergeAnchorWithCatalog(anchor, catalog);
        setAnchorArt(displayAnchor);

        const report = buildAssociationReport(anchor, catalog, { ygorgQaRelatedCardIds });
        const idToName = new Map<number, string>();
        for (const c of catalog) idToName.set(c.id, c.name_en?.trim() || c.name);
        const markdown = associationReportToMarkdown(report, idToName);
        latestAssociationMarkdown = markdown;
        els.body.innerHTML = renderReportHtml(report, catalog, displayAnchor, markdown);
    } catch {
        latestAssociationMarkdown = '';
        els.body.innerHTML =
            '<p class="associations-modal__error">Impossible de charger le catalogue (réseau ou serveur).</p>';
    } finally {
        els.loading.hidden = true;
        panel?.removeAttribute('aria-busy');
        requestAnimationFrame(() => {
            const closeBtn = els.overlay.querySelector('.associations-modal__close') as HTMLButtonElement | null;
            closeBtn?.focus();
        });
    }
}
