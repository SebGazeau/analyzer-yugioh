/**
 * Branchement des actions deck.
 * - bindDeckList : interface Decks (liste Mes decks, rafraîchir, charger).
 * - bindDeckToolbar : interface Builder (clear, export, import, save, update).
 */
import { DECK_COVER_CHANGED_EVENT } from '../deck-builder/deckCoverEvents.js';
import {
    DECK_ACTION_NEW_DECK_SELECTOR,
    DECK_BTN_CLEAR_DECK_ID,
    DECK_BTN_EXPORT_JSON_ID,
    DECK_BTN_IMPORT_JSON_TRIGGER_ID,
    DECK_BTN_REFRESH_DECKS_ID,
    DECK_BTN_SAVE_SERVER_ID,
    DECK_BTN_UPDATE_SERVER_ID,
    DECK_IMPORT_JSON_INPUT_ID,
    DECK_MY_DECKS_EMPTY_ID,
    DECK_MY_DECKS_LIST_ID,
    DECK_NAME_INPUT_ID,
    DECK_SAVED_ITEM_CLASS,
} from '../deck-builder/deckConstants.js';
import {
    DATA_DECK_DELETE_ATTR,
    DATA_DECK_DUPLICATE_ATTR,
    DATA_DECK_ID_ATTR,
    DECK_SAVED_ITEM_ACTIONS_CLASS,
    DECK_SAVED_ITEM_BODY_CLASS,
    DECK_SAVED_ITEM_COVER_CLASS,
    DECK_SAVED_ITEM_COVER_IMG_CLASS,
    DECK_SAVED_ITEM_COVER_PLACEHOLDER_CLASS,
    DECK_SAVED_ITEM_DELETE_CLASS,
    DECK_SAVED_ITEM_DELETE_ICON_CLASS,
    DECK_SAVED_ITEM_DELETE_SELECTOR,
    DECK_SAVED_ITEM_DUPLICATE_CLASS,
    DECK_SAVED_ITEM_DUPLICATE_ICON_CLASS,
    DECK_SAVED_ITEM_DUPLICATE_SELECTOR,
    DECK_SAVED_ITEM_FOOTER_CLASS,
    DECK_SAVED_ITEM_META_CLASS,
    DECK_SAVED_ITEM_NAME_CLASS,
} from '../deck-builder/deckSavedListDomSelectors.js';
import {
    listMyDecks,
    loadDeckFromServer,
    deleteDeckFromServer,
    duplicateDeckOnServer,
    saveDeckToServer,
    updateDeckOnServer,
    cleanCardTable,
    exportDeckToFile,
    importDeckFromFile,
    getDeckCover,
} from '../deck.js';
import { PAGE_DECKS_SELECTOR } from '../appPageDomSelectors.js';
import { ARIA_HIDDEN_ATTR } from '../utils/ariaAttrs.js';
import {
    BTN_TYPE_ATTR,
    BTN_TYPE_BUTTON,
    IMG_LOADING_LAZY,
    ROLE_ATTR,
    ROLE_BUTTON,
    TABINDEX_ATTR,
    TABINDEX_ZERO,
    TITLE_ATTR,
} from '../utils/htmlAttrs.js';
import { setActiveTab, TAB_ID_BUILDER } from '../tabs.js';
import { escapeHtml, formatDeckDate } from '../utils/html.js';

/** Rafraîchit la liste « Mes decks » (appelée au load et après save/update). */
export async function refreshMyDecksList(): Promise<void> {
    const ul = document.getElementById(DECK_MY_DECKS_LIST_ID);
    const emptyEl = document.getElementById(DECK_MY_DECKS_EMPTY_ID);
    if (!ul) return;
    const decks = await listMyDecks();
    ul.innerHTML = '';
    if (emptyEl) {
        emptyEl.hidden = decks.length > 0;
    }
    for (const d of decks) {
        const li = document.createElement('li');
        li.className = DECK_SAVED_ITEM_CLASS;
        li.setAttribute(DATA_DECK_ID_ATTR, String(d.id));
        li.setAttribute(ROLE_ATTR, ROLE_BUTTON);
        li.setAttribute(TABINDEX_ATTR, TABINDEX_ZERO);
        li.title = `Charger le deck « ${escapeHtml(d.name)} »`;
        const coverFromApi = d.cover_image_url != null ? { imageUrl: d.cover_image_url, name: d.cover_card_name ?? '' } : null;
        const cover = coverFromApi ?? getDeckCover(d.id);
        const coverEl = document.createElement('div');
        coverEl.className = DECK_SAVED_ITEM_COVER_CLASS;
        if (cover?.imageUrl) {
            const img = document.createElement('img');
            img.className = DECK_SAVED_ITEM_COVER_IMG_CLASS;
            img.src = cover.imageUrl;
            img.alt = '';
            img.loading = IMG_LOADING_LAZY;
            coverEl.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = DECK_SAVED_ITEM_COVER_PLACEHOLDER_CLASS;
            placeholder.setAttribute(ARIA_HIDDEN_ATTR, 'true');
            coverEl.appendChild(placeholder);
        }
        li.appendChild(coverEl);
        const meta = d.created_at
            ? `<span class="${DECK_SAVED_ITEM_META_CLASS}">${formatDeckDate(d.created_at)}</span>`
            : '';
        const trashSvg = `<svg class="${DECK_SAVED_ITEM_DELETE_ICON_CLASS}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ARIA_HIDDEN_ATTR}="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
        const copySvg = `<svg class="${DECK_SAVED_ITEM_DUPLICATE_ICON_CLASS}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ARIA_HIDDEN_ATTR}="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        const bodyEl = document.createElement('div');
        bodyEl.className = DECK_SAVED_ITEM_BODY_CLASS;
        bodyEl.innerHTML = `<span class="${DECK_SAVED_ITEM_NAME_CLASS}">${escapeHtml(d.name)}</span><div class="${DECK_SAVED_ITEM_FOOTER_CLASS}">${meta}<div class="${DECK_SAVED_ITEM_ACTIONS_CLASS}"><button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_SAVED_ITEM_DUPLICATE_CLASS}" ${DATA_DECK_DUPLICATE_ATTR}="${d.id}" ${TITLE_ATTR}="Dupliquer le deck">${copySvg}</button><button ${BTN_TYPE_ATTR}="${BTN_TYPE_BUTTON}" class="${DECK_SAVED_ITEM_DELETE_CLASS}" ${DATA_DECK_DELETE_ATTR}="${d.id}" ${TITLE_ATTR}="Supprimer le deck">${trashSvg}</button></div></div>`;
        li.appendChild(bodyEl);
        const duplicateBtn = bodyEl.querySelector<HTMLButtonElement>(DECK_SAVED_ITEM_DUPLICATE_SELECTOR);
        duplicateBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const r = await duplicateDeckOnServer(d.id);
            if (r.error) alert('Erreur: ' + r.error);
            else {
                await refreshMyDecksList();
                alert(`Deck dupliqué : « ${d.name} (copie) »`);
            }
        });
        const deleteBtn = bodyEl.querySelector<HTMLButtonElement>(DECK_SAVED_ITEM_DELETE_SELECTOR);
        deleteBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm(`Supprimer le deck « ${escapeHtml(d.name)} » ?`)) return;
            const ok = await deleteDeckFromServer(d.id);
            if (!ok) alert('Impossible de supprimer le deck.');
            else await refreshMyDecksList();
        });
        const loadDeck = async () => {
            const ok = await loadDeckFromServer(d.id);
            if (!ok) alert('Impossible de charger le deck');
            else {
                setActiveTab(TAB_ID_BUILDER);
            }
        };
        li.addEventListener('click', loadDeck);
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                loadDeck();
            }
        });
        ul.appendChild(li);
    }
}

/** Interface Decks : liste Mes decks (rafraîchir, clic sur carte = charger) + carte New Deck. */
export function bindDeckList(): void {
    const pageDecks = document.querySelector(PAGE_DECKS_SELECTOR);
    if (!pageDecks) return;
    document.getElementById(DECK_BTN_REFRESH_DECKS_ID)?.addEventListener('click', refreshMyDecksList);
    window.addEventListener(DECK_COVER_CHANGED_EVENT, () => refreshMyDecksList());
    refreshMyDecksList();

    const newDeckCard = pageDecks.querySelector<HTMLElement>(DECK_ACTION_NEW_DECK_SELECTOR);
    newDeckCard?.addEventListener('click', () => {
        cleanCardTable();
        setActiveTab(TAB_ID_BUILDER);
        const nameInput = document.getElementById(DECK_NAME_INPUT_ID) as HTMLInputElement | null;
        nameInput?.focus();
    });
    newDeckCard?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            newDeckCard.click();
        }
    });
}

/** Interface Builder : toolbar (clear, export, import, save, update). */
export function bindDeckToolbar(): void {
    const importInput = document.getElementById(DECK_IMPORT_JSON_INPUT_ID) as HTMLInputElement | null;

    document.getElementById(DECK_BTN_CLEAR_DECK_ID)?.addEventListener('click', cleanCardTable);
    document.getElementById(DECK_BTN_EXPORT_JSON_ID)?.addEventListener('click', exportDeckToFile);
    document.getElementById(DECK_BTN_IMPORT_JSON_TRIGGER_ID)?.addEventListener('click', () => importInput?.click());
    if (importInput) importInput.addEventListener('change', importDeckFromFile);

    document.getElementById(DECK_BTN_SAVE_SERVER_ID)?.addEventListener('click', async () => {
        const r = await saveDeckToServer();
        if (r.error) alert('Erreur: ' + r.error);
        else if (r.id) {
            alert('Deck enregistré (id: ' + r.id + ')');
            await refreshMyDecksList();
        }
    });
    document.getElementById(DECK_BTN_UPDATE_SERVER_ID)?.addEventListener('click', async () => {
        const r = await updateDeckOnServer();
        if (r.error) alert('Erreur: ' + r.error);
        else if (r.ok) {
            alert('Deck mis à jour.');
            await refreshMyDecksList();
        }
    });
}

/** Tous les branchements deck (liste + toolbar). Compatibilité. */
export function bindDeckActions(): void {
    bindDeckList();
    bindDeckToolbar();
}
