/**
 * Brouillon builder : persistance avant auth + restauration au retour sur `/` (même onglet).
 */
import {
    clearBuilderDeckDraftFromSession,
    deckSectionsHaveRows,
    draftPayloadForImport,
    readBuilderDeckDraftFromSession,
} from '../deck-builder/builderDeckDraft.js';
import {
    MSG_BUILDER_DRAFT_RESTORE_CONFIRM,
    MSG_BUILDER_DRAFT_RESTORE_FAILED_PREFIX,
} from '../deck-builder/builderDeckDraftCopy.js';
import { DECK_IMPORT_JSON_WARN_FAILED_CARDS_PREFIX } from '../deck-builder/deckFileIoCopy.js';
import {
    getDeckState,
    importDeckFromJsonData,
    persistBuilderDeckDraftSync,
    refreshDeckSaveUpdateButtons,
    setDeckName,
} from '../deck.js';
import {
    DOM_EVENT_CLICK,
    DOM_EVENT_PAGEHIDE,
    DOM_EVENT_SUBMIT,
} from '../utils/domEventNames.js';
import { msgImportCardsNotFound } from '../utils/userDialogMessages.js';

function isSameOriginRegisterLink(a: HTMLAnchorElement): boolean {
    const href = a.getAttribute('href');
    if (!href) return false;
    try {
        const u = new URL(href, window.location.origin);
        return u.pathname === '/register' && u.origin === window.location.origin;
    } catch {
        return false;
    }
}

function isSameOriginLoginForm(form: HTMLFormElement): boolean {
    const action = form.getAttribute('action') || '';
    try {
        const u = new URL(action, window.location.origin);
        return u.pathname === '/login' && u.origin === window.location.origin;
    } catch {
        return false;
    }
}

/** À appeler une fois au chargement de l’app (avant ou après init builder). */
export function bindBuilderDeckDraftLifecycle(): void {
    document.addEventListener(
        DOM_EVENT_CLICK,
        (e: MouseEvent) => {
            const t = e.target;
            if (!(t instanceof Element)) return;
            const a = t.closest('a');
            if (!(a instanceof HTMLAnchorElement)) return;
            if (!isSameOriginRegisterLink(a)) return;
            persistBuilderDeckDraftSync();
        },
        true,
    );

    document.addEventListener(
        DOM_EVENT_SUBMIT,
        (e: Event) => {
            const form = e.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (!isSameOriginLoginForm(form)) return;
            persistBuilderDeckDraftSync();
        },
        true,
    );

    window.addEventListener(DOM_EVENT_PAGEHIDE, () => {
        persistBuilderDeckDraftSync();
    });
}

/**
 * Si un brouillon est présent en sessionStorage, tente de réimporter le deck (après inscription / connexion).
 */
export async function tryRestoreBuilderDeckDraftOnLoad(): Promise<void> {
    const draft = readBuilderDeckDraftFromSession();
    if (!draft) return;

    const state = getDeckState();
    if (deckSectionsHaveRows(state)) {
        if (!globalThis.confirm(MSG_BUILDER_DRAFT_RESTORE_CONFIRM)) return;
    }

    try {
        const failed = await importDeckFromJsonData(draftPayloadForImport(draft));
        setDeckName(draft.name);
        clearBuilderDeckDraftFromSession();
        refreshDeckSaveUpdateButtons();
        if (failed.length > 0) {
            console.warn(DECK_IMPORT_JSON_WARN_FAILED_CARDS_PREFIX, failed);
            alert(msgImportCardsNotFound(failed));
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`${MSG_BUILDER_DRAFT_RESTORE_FAILED_PREFIX}${msg}`);
    }
}
