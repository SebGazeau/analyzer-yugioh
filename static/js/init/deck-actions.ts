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
    DATA_DECK_ID_ATTR,
    DECK_SAVED_ITEM_BODY_CLASS,
    DECK_SAVED_ITEM_COVER_CLASS,
    DECK_SAVED_ITEM_COVER_IMG_CLASS,
    DECK_SAVED_ITEM_COVER_PLACEHOLDER_CLASS,
    DECK_SAVED_ITEM_DELETE_SELECTOR,
    DECK_SAVED_ITEM_DUPLICATE_SELECTOR,
    deckSavedListItemLoadTitle,
} from '../deck-builder/deckSavedListDomSelectors.js';
import { DOM_EVENT_CHANGE, DOM_EVENT_CLICK, DOM_EVENT_KEYDOWN } from '../utils/domEventNames.js';
import { KEY_ENTER, KEY_SPACE } from '../utils/keyboardKeys.js';
import { deckSavedListItemBodyInnerHtml } from '../deck-builder/deckSavedListItemBodyHtml.js';
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
import { IMG_LOADING_LAZY, ROLE_ATTR, ROLE_BUTTON, TABINDEX_ATTR, TABINDEX_ZERO } from '../utils/htmlAttrs.js';
import { setActiveTab, TAB_ID_BUILDER } from '../tabs.js';
import {
    MSG_DECK_DELETE_FAILED,
    MSG_DECK_LOAD_FAILED,
    MSG_DECK_UPDATED,
    msgConfirmDeleteDeck,
    msgDeckDuplicated,
    msgDeckSavedWithId,
    msgErrorPrefixed,
} from '../utils/userDialogMessages.js';
import { showToast } from '../utils/toast.js';

/** Après 401, `deckApi` peut lancer un reload : éviter l’alerte « erreur » si le chrome SSR indique encore connecté. */
function shouldSkipErrorAlertDueToStaleSessionReload(unauthorized?: boolean): boolean {
    return Boolean(
        unauthorized &&
            typeof document !== 'undefined' &&
            document.querySelector('[data-auth-action="logout"]'),
    );
}

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
        li.title = deckSavedListItemLoadTitle(d.name);
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
        const bodyEl = document.createElement('div');
        bodyEl.className = DECK_SAVED_ITEM_BODY_CLASS;
        bodyEl.innerHTML = deckSavedListItemBodyInnerHtml({
            deckName: d.name,
            deckId: d.id,
            createdAtIso: d.created_at ?? null,
        });
        li.appendChild(bodyEl);
        const duplicateBtn = bodyEl.querySelector<HTMLButtonElement>(DECK_SAVED_ITEM_DUPLICATE_SELECTOR);
        duplicateBtn?.addEventListener(DOM_EVENT_CLICK, async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const r = await duplicateDeckOnServer(d.id);
            if (r.error && !shouldSkipErrorAlertDueToStaleSessionReload(r.unauthorized)) {
                showToast(msgErrorPrefixed(r.error), { variant: 'error' });
            } else if (!r.error) {
                await refreshMyDecksList();
                showToast(msgDeckDuplicated(d.name), { variant: 'success' });
            }
        });
        const deleteBtn = bodyEl.querySelector<HTMLButtonElement>(DECK_SAVED_ITEM_DELETE_SELECTOR);
        deleteBtn?.addEventListener(DOM_EVENT_CLICK, async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm(msgConfirmDeleteDeck(d.name))) return;
            const del = await deleteDeckFromServer(d.id);
            if (!del.ok && !shouldSkipErrorAlertDueToStaleSessionReload(del.unauthorized)) {
                showToast(MSG_DECK_DELETE_FAILED, { variant: 'error' });
            } else if (del.ok) await refreshMyDecksList();
        });
        const loadDeck = async () => {
            const loaded = await loadDeckFromServer(d.id);
            if (!loaded.ok && !shouldSkipErrorAlertDueToStaleSessionReload(loaded.unauthorized)) {
                showToast(MSG_DECK_LOAD_FAILED, { variant: 'error' });
            } else if (loaded.ok) {
                setActiveTab(TAB_ID_BUILDER);
            }
        };
        li.addEventListener(DOM_EVENT_CLICK, loadDeck);
        li.addEventListener(DOM_EVENT_KEYDOWN, (e) => {
            if (e.key === KEY_ENTER || e.key === KEY_SPACE) {
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
    document.getElementById(DECK_BTN_REFRESH_DECKS_ID)?.addEventListener(DOM_EVENT_CLICK, refreshMyDecksList);
    window.addEventListener(DECK_COVER_CHANGED_EVENT, () => refreshMyDecksList());
    refreshMyDecksList();

    const newDeckCard = pageDecks.querySelector<HTMLElement>(DECK_ACTION_NEW_DECK_SELECTOR);
    newDeckCard?.addEventListener(DOM_EVENT_CLICK, () => {
        cleanCardTable();
        setActiveTab(TAB_ID_BUILDER);
        const nameInput = document.getElementById(DECK_NAME_INPUT_ID) as HTMLInputElement | null;
        nameInput?.focus();
    });
    newDeckCard?.addEventListener(DOM_EVENT_KEYDOWN, (e) => {
        if (e.key === KEY_ENTER || e.key === KEY_SPACE) {
            e.preventDefault();
            newDeckCard.click();
        }
    });
}

/** Interface Builder : toolbar (clear, export, import, save, update). */
export function bindDeckToolbar(): void {
    const importInput = document.getElementById(DECK_IMPORT_JSON_INPUT_ID) as HTMLInputElement | null;

    document.getElementById(DECK_BTN_CLEAR_DECK_ID)?.addEventListener(DOM_EVENT_CLICK, cleanCardTable);
    document.getElementById(DECK_BTN_EXPORT_JSON_ID)?.addEventListener(DOM_EVENT_CLICK, exportDeckToFile);
    document.getElementById(DECK_BTN_IMPORT_JSON_TRIGGER_ID)?.addEventListener(DOM_EVENT_CLICK, () => importInput?.click());
    if (importInput) importInput.addEventListener(DOM_EVENT_CHANGE, importDeckFromFile);

    document.getElementById(DECK_BTN_SAVE_SERVER_ID)?.addEventListener(DOM_EVENT_CLICK, async () => {
        const r = await saveDeckToServer();
        if (r.error) {
            if (!shouldSkipErrorAlertDueToStaleSessionReload(r.unauthorized)) {
                showToast(msgErrorPrefixed(r.error), { variant: 'error' });
            }
        } else if (r.id) {
            showToast(msgDeckSavedWithId(r.id), { variant: 'success' });
            await refreshMyDecksList();
        }
    });
    document.getElementById(DECK_BTN_UPDATE_SERVER_ID)?.addEventListener(DOM_EVENT_CLICK, async () => {
        const r = await updateDeckOnServer();
        if (r.error) {
            if (!shouldSkipErrorAlertDueToStaleSessionReload(r.unauthorized)) {
                showToast(msgErrorPrefixed(r.error), { variant: 'error' });
            }
        } else if (r.ok) {
            showToast(MSG_DECK_UPDATED, { variant: 'success' });
            await refreshMyDecksList();
        }
    });
}

/** Tous les branchements deck (liste + toolbar). Compatibilité. */
export function bindDeckActions(): void {
    bindDeckList();
    bindDeckToolbar();
}
