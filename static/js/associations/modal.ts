import { fetchCardByName } from '../api.js';
import { addToDeck } from '../deck.js';
import {
    ARIA_ATOMIC_ATTR,
    ARIA_BUSY_ATTR,
    ARIA_HIDDEN_ATTR,
    ARIA_LABEL_ATTR,
    ARIA_LABELLEDBY_ATTR,
    ARIA_LIVE_ATTR,
    ARIA_MODAL_ATTR,
} from '../utils/ariaAttrs.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { TEXT_EM_DASH } from '../utils/textPlaceholders.js';
import { MSG_ADD_CARD_BLOCKED, msgAssociationCardNotFound } from '../utils/userDialogMessages.js';
import {
    BTN_TYPE_ATTR,
    BTN_TYPE_BUTTON,
    IMG_DECODING_ASYNC,
    IMG_DECODING_ATTR,
    IMG_LOADING_ATTR,
    ROLE_ATTR,
    ROLE_BUTTON,
    ROLE_DIALOG,
    ROLE_DOCUMENT,
    ROLE_STATUS,
    TABINDEX_ATTR,
    TABINDEX_ZERO,
    TITLE_ATTR,
} from '../utils/htmlAttrs.js';
import {
    ASSOCIATIONS_LIVE_CANNOT_RESOLVE_CARD_NAME,
    ASSOCIATIONS_LIVE_COPY_FAILED,
    ASSOCIATIONS_LIVE_NOTHING_TO_COPY,
    ASSOCIATIONS_LIVE_REPORT_COPIED,
    associationsLiveCardAddedToDeck,
} from './associationsLiveMessages.js';
import { archetypeSourceUi } from './archetypeSourceUi.js';
import { parseArchetypesFromField } from './archetype.js';
import { getAssociationCatalog, getQaRelatedCardIds } from './associationFetchCache.js';
import { associationReportToMarkdown, buildAssociationReport, toAssociationCatalog } from './buildReport.js';
import {
    ASSOCIATIONS_ACTION_COPY_MARKDOWN,
    ASSOCIATIONS_ACTION_COPY_MARKDOWN_SELECTOR,
    ASSOCIATIONS_ACTION_EXPAND_TILES,
    ASSOCIATIONS_ACTION_EXPAND_TILES_SELECTOR,
    ASSOCIATIONS_ADD_DECK_SELECTOR,
    ASSOCIATIONS_CLOSE_SELECTOR,
    ASSOCIATIONS_MODAL_ACC_BADGE_CLASS,
    ASSOCIATIONS_MODAL_ACC_CLASS,
    ASSOCIATIONS_MODAL_ACC_LIST_CLASS,
    ASSOCIATIONS_MODAL_ACC_META_CLASS,
    ASSOCIATIONS_MODAL_ACC_PANEL_CLASS,
    ASSOCIATIONS_MODAL_ACC_SUMMARY_CLASS,
    ASSOCIATIONS_MODAL_ACC_SUMMARY_MAIN_CLASS,
    ASSOCIATIONS_MODAL_ACC_TITLE_CLASS,
    ASSOCIATIONS_MODAL_ADD_HINT_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_ART_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_IMG_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_LABEL_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_META_CLASS,
    ASSOCIATIONS_MODAL_ANCHOR_NOTE_CLASS,
    ASSOCIATIONS_MODAL_ARCH_SOURCE_CLASS,
    ASSOCIATIONS_MODAL_ARCH_SOURCE_CODE_CLASS,
    ASSOCIATIONS_MODAL_BACKDROP_CLASS,
    ASSOCIATIONS_MODAL_BODY_CLASS,
    ASSOCIATIONS_MODAL_BTN_CLASS,
    ASSOCIATIONS_MODAL_CLOSE_BTN_CLASS,
    ASSOCIATIONS_MODAL_CLOSE_BTN_SELECTOR,
    ASSOCIATIONS_MODAL_DIAGNOSTICS_CLASS,
    ASSOCIATIONS_MODAL_EMPTY_CLASS,
    ASSOCIATIONS_MODAL_EMPTY_TEXT_CLASS,
    ASSOCIATIONS_MODAL_EMPTY_TITLE_CLASS,
    ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT,
    ASSOCIATIONS_MODAL_CLOSE_BTN_ARIA_LABEL,
    ASSOCIATIONS_MODAL_ERROR_CLASS,
    ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT,
    ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE,
    associationsModalSubtitle,
    ASSOCIATIONS_MODAL_EXPAND_TILES_BTN_CLASS,
    ASSOCIATIONS_MODAL_FOOTER_CLASS,
    ASSOCIATIONS_MODAL_HEADER_CLASS,
    ASSOCIATIONS_MODAL_HEADER_MAIN_CLASS,
    ASSOCIATIONS_MODAL_HEADER_TEXT_CLASS,
    ASSOCIATIONS_MODAL_LIVE_CLASS,
    ASSOCIATIONS_MODAL_LOADING_CLASS,
    ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT,
    ASSOCIATIONS_MODAL_OPEN_CLASS,
    ASSOCIATIONS_MODAL_PANEL_CLASS,
    ASSOCIATIONS_MODAL_PRE_CLASS,
    ASSOCIATIONS_MODAL_RAW_CLASS,
    ASSOCIATIONS_MODAL_ROOT_CLASS,
    ASSOCIATIONS_MODAL_SPINNER_CLASS,
    ASSOCIATIONS_MODAL_STAT_CLASS,
    ASSOCIATIONS_MODAL_STAT_VALUE_CLASS,
    ASSOCIATIONS_MODAL_SUBTITLE_CLASS,
    ASSOCIATIONS_MODAL_SUMMARY_CLASS,
    ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS,
    ASSOCIATIONS_MODAL_TILE_ART_CLASS,
    ASSOCIATIONS_MODAL_TILE_CAPTION_CLASS,
    ASSOCIATIONS_MODAL_TILE_CLASS,
    ASSOCIATIONS_MODAL_TILE_GRID_CLASS,
    ASSOCIATIONS_MODAL_TILE_GRID_UL_SELECTOR,
    ASSOCIATIONS_MODAL_TILE_IMG_CLASS,
    ASSOCIATIONS_MODAL_TILE_MORE_LI_CLASS,
    ASSOCIATIONS_MODAL_TILE_MORE_LI_SELECTOR,
    ASSOCIATIONS_MODAL_TILE_NAME_CLASS,
    ASSOCIATIONS_MODAL_TITLE_CLASS,
    DATA_ASSOCIATION_ANGLE_ATTR,
    DATA_ASSOCIATIONS_ACTION_ATTR,
    DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR,
    DATA_ASSOCIATIONS_ADD_DECK_ATTR,
    DATA_ASSOCIATIONS_ARCHETYPE_SOURCE_ATTR,
    DATA_ASSOCIATIONS_CLOSE_ATTR,
    DATA_ASSOCIATIONS_REST_IDS_ATTR,
    DATA_ASSOCIATIONS_TILE_MORE_ATTR,
    DATA_CARD_ID_ATTR,
} from './associationsDomSelectors.js';
import {
    ASSOCIATIONS_MODAL_TILES_INITIAL,
    splitAssociationTileIdsForDisplay,
} from './modalTileLimit.js';
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
/** Catalogue du dernier rapport affiché (expansion « Voir plus » des tuiles). */
let lastModalCatalogForTiles: AssociationCatalogCard[] | null = null;

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
        return `<img class="${imgClass}" src="${escapeAttr(imageUrl)}" alt="${safeName}" width="59" height="86" ${IMG_LOADING_ATTR}="${loading}" ${IMG_DECODING_ATTR}="${IMG_DECODING_ASYNC}" />`;
    }
    const initials =
        name
            .replace(/[^a-zA-ZÀ-ÿ0-9]/g, '')
            .slice(0, 2)
            .toUpperCase() || '?';
    return `<div class="${ASSOCIATIONS_MODAL_THUMB_PLACEHOLDER_CLASS}" ${ARIA_HIDDEN_ATTR}="true"><span>${escapeHtml(initials)}</span></div>`;
}

function renderTileListItemHtml(id: number, idToCard: Map<number, AssociationCatalogCard>): string {
    const row = idToCard.get(id);
    const nm = row ? row.name_en?.trim() || row.name : `#${id}`;
    const art = renderThumbInner(row?.image_url, nm, ASSOCIATIONS_MODAL_TILE_IMG_CLASS, 'lazy');
    return `<li class="${ASSOCIATIONS_MODAL_TILE_CLASS}" ${DATA_CARD_ID_ATTR}="${id}" ${DATA_ASSOCIATIONS_ADD_DECK_ATTR}="1" ${ROLE_ATTR}="${ROLE_BUTTON}" ${TABINDEX_ATTR}="${TABINDEX_ZERO}" ${TITLE_ATTR}="${ASSOCIATIONS_MODAL_TILE_ADD_DECK_TITLE}"><div class="${ASSOCIATIONS_MODAL_TILE_ART_CLASS}">${art}</div><div class="${ASSOCIATIONS_MODAL_TILE_CAPTION_CLASS}"><span class="${ASSOCIATIONS_MODAL_TILE_NAME_CLASS}">${escapeHtml(nm)}</span></div></li>`;
}

function handleExpandAssociationTiles(btn: HTMLButtonElement): void {
    const cat = lastModalCatalogForTiles;
    if (!cat) return;
    const raw = btn.getAttribute(DATA_ASSOCIATIONS_REST_IDS_ATTR) ?? '';
    const rest = raw
        .split(',')
        .map((s) => s.trim())
        .map(Number)
        .filter((n) => Number.isFinite(n));
    if (rest.length === 0) return;
    const ul = btn.closest(ASSOCIATIONS_MODAL_TILE_GRID_UL_SELECTOR);
    if (!ul) return;
    const idToCard = new Map<number, AssociationCatalogCard>();
    for (const c of cat) idToCard.set(c.id, c);
    const html = rest.map((id) => renderTileListItemHtml(id, idToCard)).join('');
    const liWrap = btn.closest(ASSOCIATIONS_MODAL_TILE_MORE_LI_SELECTOR);
    if (liWrap) {
        liWrap.insertAdjacentHTML('beforebegin', html);
        liWrap.remove();
    }
}

function setAnchorArt(card: AssociationCatalogCard): void {
    const el = document.getElementById(MODAL_ANCHOR_ART_ID);
    if (!el) return;
    const name = card.name_en?.trim() || card.name;
    el.innerHTML = renderThumbInner(card.image_url, name, ASSOCIATIONS_MODAL_ANCHOR_IMG_CLASS, 'eager');
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
        archetype: row.archetype ?? anchor.archetype ?? null,
        archetype_source: row.archetype_source ?? anchor.archetype_source ?? null,
    };
}

function announceAssociationsModal(message: string): void {
    const live = document.getElementById(MODAL_LIVE_ID);
    if (!live) return;
    live.textContent = '';
    void live.offsetWidth;
    live.textContent = message;
}

async function addAssociationTileToDeck(tile: Element): Promise<void> {
    const idStr = tile.getAttribute(DATA_CARD_ID_ATTR);
    const id = idStr ? parseInt(idStr, 10) : NaN;
    if (!Number.isFinite(id)) return;
    const cat = lastModalCatalogForTiles;
    const row = cat?.find((c) => c.id === id);
    const searchName = row?.name_en?.trim() || row?.name?.trim();
    if (!searchName) {
        announceAssociationsModal(ASSOCIATIONS_LIVE_CANNOT_RESOLVE_CARD_NAME);
        return;
    }
    let card = await fetchCardByName(searchName);
    if (!card) {
        const { fetchSearchResultsForQuery, pickBestCardFromSearchResults } = await import('../search.js');
        const results = await fetchSearchResultsForQuery(searchName);
        card = pickBestCardFromSearchResults(results, searchName);
    }
    if (!card) {
        alert(msgAssociationCardNotFound(searchName));
        return;
    }
    const ok = await addToDeck(card);
    if (!ok) {
        alert(MSG_ADD_CARD_BLOCKED);
        return;
    }
    announceAssociationsModal(associationsLiveCardAddedToDeck(searchName));
}

async function copyMarkdownToClipboard(): Promise<void> {
    const text = latestAssociationMarkdown;
    if (!text.trim()) {
        announceAssociationsModal(ASSOCIATIONS_LIVE_NOTHING_TO_COPY);
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        announceAssociationsModal(ASSOCIATIONS_LIVE_REPORT_COPIED);
    } catch {
        announceAssociationsModal(ASSOCIATIONS_LIVE_COPY_FAILED);
    }
}

function ensureModalElements(): {
    overlay: HTMLElement;
    body: HTMLElement;
    loading: HTMLElement;
} | null {
    let overlay = document.getElementById(MODAL_ID) as HTMLElement | null;
    if (!overlay) {
        const created = document.createElement('div');
        overlay = created;
        overlay.id = MODAL_ID;
        overlay.className = ASSOCIATIONS_MODAL_ROOT_CLASS;
        overlay.setAttribute(ROLE_ATTR, ROLE_DIALOG);
        overlay.setAttribute(ARIA_MODAL_ATTR, 'true');
        overlay.setAttribute(ARIA_LABELLEDBY_ATTR, MODAL_TITLE_ID);
        overlay.innerHTML = `
            <div class="${ASSOCIATIONS_MODAL_BACKDROP_CLASS}" ${DATA_ASSOCIATIONS_CLOSE_ATTR}="1"></div>
            <div class="${ASSOCIATIONS_MODAL_PANEL_CLASS}" id="${MODAL_PANEL_ID}" ${ROLE_ATTR}="${ROLE_DOCUMENT}">
                <div id="${MODAL_LIVE_ID}" class="${ASSOCIATIONS_MODAL_LIVE_CLASS}" ${ARIA_LIVE_ATTR}="polite" ${ARIA_ATOMIC_ATTR}="true"></div>
                <header class="${ASSOCIATIONS_MODAL_HEADER_CLASS}">
                    <div class="${ASSOCIATIONS_MODAL_HEADER_MAIN_CLASS}">
                        <div class="${ASSOCIATIONS_MODAL_ANCHOR_ART_CLASS}" id="${MODAL_ANCHOR_ART_ID}" ${ARIA_HIDDEN_ATTR}="true"></div>
                        <div class="${ASSOCIATIONS_MODAL_HEADER_TEXT_CLASS}">
                            <h2 id="${MODAL_TITLE_ID}" class="${ASSOCIATIONS_MODAL_TITLE_CLASS}">${ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT}</h2>
                            <p id="${MODAL_SUBTITLE_ID}" class="${ASSOCIATIONS_MODAL_SUBTITLE_CLASS}"></p>
                        </div>
                    </div>
                    <button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${ASSOCIATIONS_MODAL_CLOSE_BTN_CLASS}" ${DATA_ASSOCIATIONS_CLOSE_ATTR}="1" ${ARIA_LABEL_ATTR}="${ASSOCIATIONS_MODAL_CLOSE_BTN_ARIA_LABEL}">×</button>
                </header>
                <div id="${MODAL_LOADING_ID}" class="${ASSOCIATIONS_MODAL_LOADING_CLASS}" hidden>
                    <span class="${ASSOCIATIONS_MODAL_SPINNER_CLASS}" ${ARIA_HIDDEN_ATTR}="true"></span>
                    <span>${ASSOCIATIONS_MODAL_LOADING_STATUS_TEXT}</span>
                </div>
                <div id="${MODAL_BODY_ID}" class="${ASSOCIATIONS_MODAL_BODY_CLASS}"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            const el = e.target as HTMLElement;
            const addTile = el.closest(ASSOCIATIONS_ADD_DECK_SELECTOR);
            if (addTile) {
                e.preventDefault();
                e.stopPropagation();
                void addAssociationTileToDeck(addTile);
                return;
            }
            if (el.closest(ASSOCIATIONS_CLOSE_SELECTOR)) {
                closeAssociationsModal();
            }
            if (el.closest(ASSOCIATIONS_ACTION_COPY_MARKDOWN_SELECTOR)) {
                e.preventDefault();
                void copyMarkdownToClipboard();
            }
            const expandBtn = el.closest(ASSOCIATIONS_ACTION_EXPAND_TILES_SELECTOR) as HTMLButtonElement | null;
            if (expandBtn) {
                e.preventDefault();
                handleExpandAssociationTiles(expandBtn);
            }
        });
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            const mod = document.getElementById(MODAL_ID);
            if (!mod || mod.hidden) return;
            if (e.key === 'Escape') {
                closeAssociationsModal();
                return;
            }
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const t = e.target as HTMLElement;
            const tile = t.closest(ASSOCIATIONS_ADD_DECK_SELECTOR);
            if (!tile || !mod.contains(tile)) return;
            e.preventDefault();
            void addAssociationTileToDeck(tile);
        });
    }
    const body = document.getElementById(MODAL_BODY_ID) as HTMLElement | null;
    const loading = document.getElementById(MODAL_LOADING_ID) as HTMLElement | null;
    if (!body || !loading) return null;
    return { overlay, body, loading };
}

export function closeAssociationsModal(): void {
    lastModalCatalogForTiles = null;
    const el = document.getElementById(MODAL_ID);
    if (el) {
        el.hidden = true;
        el.classList.remove(ASSOCIATIONS_MODAL_OPEN_CLASS);
    }
    document.getElementById(MODAL_PANEL_ID)?.removeAttribute(ARIA_BUSY_ATTR);
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
            : `${TEXT_EM_DASH} (aucun archétype structuré dans les données)`;
    const { groupsWithCards, uniqueCardCount } = countAssociationStats(report.groups);

    const parts: string[] = [];
    parts.push(`<div class="${ASSOCIATIONS_MODAL_SUMMARY_CLASS}" ${ROLE_ATTR}="${ROLE_STATUS}">`);
    parts.push(
        `<span class="${ASSOCIATIONS_MODAL_STAT_CLASS}"><span class="${ASSOCIATIONS_MODAL_STAT_VALUE_CLASS}">${groupsWithCards}</span> angle(s) avec cartes</span>`,
    );
    parts.push(
        `<span class="${ASSOCIATIONS_MODAL_STAT_CLASS}"><span class="${ASSOCIATIONS_MODAL_STAT_VALUE_CLASS}">${uniqueCardCount}</span> carte(s) distincte(s)</span>`,
    );
    parts.push(`</div>`);
    parts.push(
        `<p class="${ASSOCIATIONS_MODAL_ADD_HINT_CLASS}">Clique une <strong>vignette</strong> ci-dessous pour <strong>ajouter la carte au deck</strong> (comme le + du builder).</p>`,
    );

    parts.push(`<div class="${ASSOCIATIONS_MODAL_ANCHOR_META_CLASS}">`);
    parts.push(`<p class="${ASSOCIATIONS_MODAL_ANCHOR_LABEL_CLASS}">Ancre ${TEXT_EM_DASH} métadonnées</p>`);
    parts.push(
        `<p><strong>Archétype(s) ${TEXT_EM_DASH} champ API</strong> : ${escapeHtml(archLine)}</p>`,
    );
    const srcRaw = anchor.archetype_source?.trim();
    if (srcRaw) {
        const { short, title } = archetypeSourceUi(srcRaw);
        parts.push(
            `<p><strong>Provenance archétype</strong> : <span class="${ASSOCIATIONS_MODAL_ARCH_SOURCE_CLASS}" ${DATA_ASSOCIATIONS_ARCHETYPE_SOURCE_ATTR}="${escapeAttr(
                srcRaw,
            )}" title="${escapeAttr(title)}">${escapeHtml(short || srcRaw)}</span> <code class="${ASSOCIATIONS_MODAL_ARCH_SOURCE_CODE_CLASS}">${escapeHtml(
                srcRaw,
            )}</code></p>`,
        );
    }
    parts.push(
        `<p class="${ASSOCIATIONS_MODAL_ANCHOR_NOTE_CLASS}">Le groupe « même archétype » repose sur ce champ (souvent YGOProDeck). S’il ne correspond pas au jeu papier, la base importée est en cause ${TEXT_EM_DASH} pas la logique de regroupement.</p>`,
    );
    parts.push(`</div>`);

    if (report.groups.length === 0) {
        parts.push(`<div class="${ASSOCIATIONS_MODAL_EMPTY_CLASS}">`);
        parts.push(`<p class="${ASSOCIATIONS_MODAL_EMPTY_TITLE_CLASS}">Aucune association détectée</p>`);
        parts.push(
            `<p class="${ASSOCIATIONS_MODAL_EMPTY_TEXT_CLASS}">Consulte les diagnostics éventuels pour comprendre les angles ignorés (archétype absent, textes vides, etc.).</p>`,
        );
        parts.push(`</div>`);
    }

    parts.push(`<div class="${ASSOCIATIONS_MODAL_ACC_LIST_CLASS}">`);
    for (let gi = 0; gi < report.groups.length; gi++) {
        const g = report.groups[gi];
        const openAttr = gi === 0 ? ' open' : '';
        parts.push(
            `<details class="${ASSOCIATIONS_MODAL_ACC_CLASS}"${openAttr} ${DATA_ASSOCIATION_ANGLE_ATTR}="${escapeAttr(g.angleId)}">`,
        );
        parts.push(`<summary class="${ASSOCIATIONS_MODAL_ACC_SUMMARY_CLASS}">`);
        parts.push(`<span class="${ASSOCIATIONS_MODAL_ACC_SUMMARY_MAIN_CLASS}">`);
        parts.push(`<span class="${ASSOCIATIONS_MODAL_ACC_TITLE_CLASS}">${escapeHtml(g.displayLabel)}</span>`);
        parts.push(
            `<span class="${ASSOCIATIONS_MODAL_ACC_META_CLASS}"><span>${escapeHtml(g.linkStrength)}</span> · ${g.cardIds.length} carte(s) · <code>${escapeHtml(g.angleId)}</code></span>`,
        );
        parts.push(`</span>`);
        parts.push(
            `<span class="${ASSOCIATIONS_MODAL_ACC_BADGE_CLASS}" ${ARIA_HIDDEN_ATTR}="true">${g.cardIds.length}</span>`,
        );
        parts.push(`</summary>`);
        parts.push(`<div class="${ASSOCIATIONS_MODAL_ACC_PANEL_CLASS}">`);
        parts.push(`<ul class="${ASSOCIATIONS_MODAL_TILE_GRID_CLASS}">`);
        const { visible, rest } = splitAssociationTileIdsForDisplay(g.cardIds, ASSOCIATIONS_MODAL_TILES_INITIAL);
        for (const id of visible) {
            parts.push(renderTileListItemHtml(id, idToCard));
        }
        if (rest.length > 0) {
            const idsAttr = rest.join(',');
            parts.push(
                `<li class="${ASSOCIATIONS_MODAL_TILE_MORE_LI_CLASS}" ${DATA_ASSOCIATIONS_TILE_MORE_ATTR}="1"><button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${ASSOCIATIONS_MODAL_EXPAND_TILES_BTN_CLASS}" ${DATA_ASSOCIATIONS_ACTION_ATTR}="${ASSOCIATIONS_ACTION_EXPAND_TILES}" ${DATA_ASSOCIATIONS_REST_IDS_ATTR}="${escapeAttr(idsAttr)}" ${ARIA_LABEL_ATTR}="${escapeAttr(`Afficher ${rest.length} carte${rest.length > 1 ? 's' : ''} supplémentaires dans ce groupe`)}">+ ${rest.length} carte${rest.length > 1 ? 's' : ''}…</button></li>`,
            );
        }
        parts.push('</ul></div></details>');
    }
    parts.push('</div>');

    if (report.diagnostics.length > 0) {
        parts.push(`<section class="${ASSOCIATIONS_MODAL_DIAGNOSTICS_CLASS}"><h3>Diagnostics</h3><ul>`);
        for (const d of report.diagnostics) {
            parts.push(
                `<li ${DATA_ASSOCIATIONS_DIAGNOSTIC_SEVERITY_ATTR}="${escapeAttr(d.severity)}"><strong>${escapeHtml(d.code)}</strong> ${TEXT_EM_DASH} ${escapeHtml(d.message)}</li>`,
            );
        }
        parts.push('</ul></section>');
    }

    parts.push(`<div class="${ASSOCIATIONS_MODAL_FOOTER_CLASS}">`);
    parts.push(
        `<button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${ASSOCIATIONS_MODAL_BTN_CLASS}" ${DATA_ASSOCIATIONS_ACTION_ATTR}="${ASSOCIATIONS_ACTION_COPY_MARKDOWN}">Copier le rapport (Markdown)</button>`,
    );
    parts.push(
        `<details class="${ASSOCIATIONS_MODAL_RAW_CLASS}"><summary>Aperçu Markdown</summary><pre class="${ASSOCIATIONS_MODAL_PRE_CLASS}">${escapeHtml(
            markdown,
        )}</pre></details>`,
    );
    parts.push(`</div>`);

    return parts.join('');
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
    els.overlay.classList.add(ASSOCIATIONS_MODAL_OPEN_CLASS);
    els.loading.hidden = false;
    els.body.innerHTML = '';
    const title = document.getElementById(MODAL_TITLE_ID);
    if (title) title.textContent = ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT;
    const subtitle = document.getElementById(MODAL_SUBTITLE_ID);
    if (subtitle) {
        const displayName = anchor.name_en?.trim() || anchor.name;
        subtitle.textContent = associationsModalSubtitle(displayName, anchor.id);
    }
    setAnchorArt(anchor);

    const panel = document.getElementById(MODAL_PANEL_ID);
    panel?.setAttribute(ARIA_BUSY_ATTR, 'true');

    try {
        const [catalog, ygorgQaRelatedCardIds] = await Promise.all([
            getAssociationCatalog(),
            getQaRelatedCardIds(anchor.id),
        ]);
        const displayAnchor = mergeAnchorWithCatalog(anchor, catalog);
        setAnchorArt(displayAnchor);

        const report = buildAssociationReport(displayAnchor, catalog, { ygorgQaRelatedCardIds });
        const idToName = new Map<number, string>();
        for (const c of catalog) idToName.set(c.id, c.name_en?.trim() || c.name);
        const markdown = associationReportToMarkdown(report, idToName);
        latestAssociationMarkdown = markdown;
        lastModalCatalogForTiles = catalog;
        els.body.innerHTML = renderReportHtml(report, catalog, displayAnchor, markdown);
    } catch {
        latestAssociationMarkdown = '';
        lastModalCatalogForTiles = null;
        els.body.innerHTML = `<p class="${ASSOCIATIONS_MODAL_ERROR_CLASS}">${ASSOCIATIONS_MODAL_CATALOG_LOAD_ERROR_TEXT}</p>`;
    } finally {
        els.loading.hidden = true;
        panel?.removeAttribute(ARIA_BUSY_ATTR);
        requestAnimationFrame(() => {
            const closeBtn = els.overlay.querySelector(ASSOCIATIONS_MODAL_CLOSE_BTN_SELECTOR) as HTMLButtonElement | null;
            closeBtn?.focus();
        });
    }
}
