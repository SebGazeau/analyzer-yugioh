import { fetchCardByName } from '../api.js';
import { addToDeck } from '../deck.js';
import {
    ARIA_BUSY_ATTR,
    ARIA_LABELLEDBY_ATTR,
    ARIA_MODAL_ATTR,
} from '../utils/ariaAttrs.js';
import { MSG_ADD_CARD_BLOCKED, msgAssociationCardNotFound } from '../utils/userDialogMessages.js';
import { ROLE_ATTR, ROLE_DIALOG } from '../utils/htmlAttrs.js';
import {
    ASSOCIATIONS_LIVE_CANNOT_RESOLVE_CARD_NAME,
    ASSOCIATIONS_LIVE_COPY_FAILED,
    ASSOCIATIONS_LIVE_NOTHING_TO_COPY,
    ASSOCIATIONS_LIVE_REPORT_COPIED,
    associationsLiveCardAddedToDeck,
} from './associationsLiveCopy.js';
import { getAssociationCatalog, getQaRelatedCardIds } from './associationFetchCache.js';
import { associationReportToMarkdown, buildAssociationReport, toAssociationCatalog } from './buildReport.js';
import {
    associationsModalCatalogLoadErrorParagraphHtml,
    associationsModalReportBodyHtml,
} from './associationsModalReportHtml.js';
import { associationsModalShellInnerHtml } from './associationsModalShellHtml.js';
import {
    associationsModalThumbInnerHtml,
    associationsModalTileListItemHtml,
} from './associationsModalTileHtml.js';
import {
    ASSOCIATIONS_ACTION_COPY_MARKDOWN_SELECTOR,
    ASSOCIATIONS_ACTION_EXPAND_TILES_SELECTOR,
    ASSOCIATIONS_ADD_DECK_SELECTOR,
    ASSOCIATIONS_CLOSE_SELECTOR,
    ASSOCIATIONS_MODAL_ANCHOR_IMG_CLASS,
    ASSOCIATIONS_MODAL_CLOSE_BTN_SELECTOR,
    ASSOCIATIONS_MODAL_HEADER_TITLE_TEXT,
    associationsModalSubtitle,
    ASSOCIATIONS_MODAL_OPEN_CLASS,
    ASSOCIATIONS_MODAL_ROOT_CLASS,
    ASSOCIATIONS_MODAL_TILE_GRID_UL_SELECTOR,
    ASSOCIATIONS_MODAL_TILE_MORE_LI_SELECTOR,
    DATA_ASSOCIATIONS_REST_IDS_ATTR,
    DATA_CARD_ID_ATTR,
} from './associationsDomSelectors.js';
import type { AssociationCatalogCard } from './types.js';

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
    const html = rest.map((id) => associationsModalTileListItemHtml(id, idToCard)).join('');
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
    el.innerHTML = associationsModalThumbInnerHtml(card.image_url, name, ASSOCIATIONS_MODAL_ANCHOR_IMG_CLASS, 'eager');
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
        overlay.innerHTML = associationsModalShellInnerHtml({
            panelId: MODAL_PANEL_ID,
            liveId: MODAL_LIVE_ID,
            loadingId: MODAL_LOADING_ID,
            bodyId: MODAL_BODY_ID,
            titleId: MODAL_TITLE_ID,
            subtitleId: MODAL_SUBTITLE_ID,
            anchorArtId: MODAL_ANCHOR_ART_ID,
        });
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
        els.body.innerHTML = associationsModalReportBodyHtml(report, catalog, displayAnchor, markdown);
    } catch {
        latestAssociationMarkdown = '';
        lastModalCatalogForTiles = null;
        els.body.innerHTML = associationsModalCatalogLoadErrorParagraphHtml();
    } finally {
        els.loading.hidden = true;
        panel?.removeAttribute(ARIA_BUSY_ATTR);
        requestAnimationFrame(() => {
            const closeBtn = els.overlay.querySelector(ASSOCIATIONS_MODAL_CLOSE_BTN_SELECTOR) as HTMLButtonElement | null;
            closeBtn?.focus();
        });
    }
}
