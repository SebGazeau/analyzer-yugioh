/**
 * Flottant d’aperçu carte (recherche builder, modal associations) : position, timers, délégation pointer.
 */
import type { SearchApiCard } from './services/search/searchApiTypes.js';
import {
    SEARCH_CARD_FLOAT_INNER_ID,
    SEARCH_CARD_FLOAT_LIVE_ID,
    SEARCH_CARD_FLOAT_ROOT_ID,
} from './searchDomIds.js';
import {
    applySearchCardPreviewCard,
    buildSearchCardPreviewLiveText,
    resetSearchCardPreview,
    setSearchCardPreviewRootVisible,
} from './searchCardPreview.js';
import {
    DOM_EVENT_POINTERENTER,
    DOM_EVENT_POINTERLEAVE,
    DOM_EVENT_POINTERMOVE,
    DOM_EVENT_POINTEROVER,
} from './utils/domEventNames.js';

export const SEARCH_FLOAT_OFFSET_PX = 14;
export const SEARCH_FLOAT_VIEWPORT_PAD_PX = 8;
export const SEARCH_FLOAT_HIDE_MS = 120;

export function clampSearchCardFloatPosition(floatEl: HTMLElement, clientX: number, clientY: number): void {
    floatEl.style.position = 'fixed';
    const w = floatEl.offsetWidth;
    const h = floatEl.offsetHeight;
    let left = clientX + SEARCH_FLOAT_OFFSET_PX;
    let top = clientY + SEARCH_FLOAT_OFFSET_PX;
    const maxL = window.innerWidth - SEARCH_FLOAT_VIEWPORT_PAD_PX - w;
    const maxT = window.innerHeight - SEARCH_FLOAT_VIEWPORT_PAD_PX - h;
    const minL = SEARCH_FLOAT_VIEWPORT_PAD_PX;
    const minT = SEARCH_FLOAT_VIEWPORT_PAD_PX;
    if (left > maxL) left = maxL;
    if (top > maxT) top = maxT;
    if (left < minL) left = minL;
    if (top < minT) top = minT;
    floatEl.style.left = `${Math.round(left)}px`;
    floatEl.style.top = `${Math.round(top)}px`;
}

/** Crée ou retrouve le nœud fixed d’aperçu (hors flux du template). */
export function ensureSearchCardFloat(): {
    root: HTMLElement;
    live: HTMLElement;
    inner: HTMLElement;
} | null {
    let root = document.getElementById(SEARCH_CARD_FLOAT_ROOT_ID) as HTMLElement | null;
    const liveExisting = document.getElementById(SEARCH_CARD_FLOAT_LIVE_ID) as HTMLElement | null;
    const innerExisting = document.getElementById(SEARCH_CARD_FLOAT_INNER_ID) as HTMLElement | null;
    if (root && liveExisting && innerExisting) {
        return { root, live: liveExisting, inner: innerExisting };
    }
    if (root?.parentNode) root.remove();
    root = document.createElement('div');
    root.id = SEARCH_CARD_FLOAT_ROOT_ID;
    root.className = 'search-card-float';
    root.setAttribute('hidden', '');
    root.setAttribute('aria-label', 'Aperçu de la carte');
    const live = document.createElement('p');
    live.id = SEARCH_CARD_FLOAT_LIVE_ID;
    live.className = 'search-card-preview__live';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    const inner = document.createElement('div');
    inner.id = SEARCH_CARD_FLOAT_INNER_ID;
    inner.className = 'search-card-preview__inner';
    root.appendChild(live);
    root.appendChild(inner);
    document.body.appendChild(root);
    return { root, live, inner };
}

export type AttachSearchCardPreviewHoverOpts = {
    /** Zone de délégation `pointerover` / `pointermove` (liste résultats, corps modal, etc.). */
    delegateRoot: HTMLElement;
    /** Quitter ce nœud sans entrer dans le flottant → masquer l’aperçu. */
    leaveRoot: HTMLElement;
    /** Sélecteur passé à `Element.closest()` depuis `event.target`. */
    itemSelector: string;
    resolveCard: (itemEl: HTMLElement) => SearchApiCard | null;
};

/** Retourne une fonction `detach` (retire les écouteurs et réinitialise l’aperçu). */
export function attachSearchCardPreviewHover(opts: AttachSearchCardPreviewHoverOpts): () => void {
    const floatEls = ensureSearchCardFloat();
    if (!floatEls) {
        return () => {};
    }
    const { root, live, inner } = floatEls;

    let lastClientX = 0;
    let lastClientY = 0;
    let rafPos: number | null = null;
    let hideTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const clearHideTimer = (): void => {
        if (hideTimer != null) {
            globalThis.clearTimeout(hideTimer);
            hideTimer = null;
        }
    };

    const scheduleReposition = (): void => {
        if (rafPos != null) return;
        rafPos = window.requestAnimationFrame(() => {
            rafPos = null;
            if (!root || root.hasAttribute('hidden')) return;
            clampSearchCardFloatPosition(root, lastClientX, lastClientY);
        });
    };

    const scheduleHideFloat = (): void => {
        clearHideTimer();
        hideTimer = globalThis.setTimeout(() => {
            hideTimer = null;
            resetSearchCardPreview(root, live, inner);
        }, SEARCH_FLOAT_HIDE_MS);
    };

    const applyPreviewNow = (card: SearchApiCard): void => {
        live.textContent = buildSearchCardPreviewLiveText(card);
        applySearchCardPreviewCard(inner, card);
        setSearchCardPreviewRootVisible(root, true);
        scheduleReposition();
        window.requestAnimationFrame(() => scheduleReposition());
    };

    const onPreviewEnter = (): void => clearHideTimer();
    const onPreviewLeave = (): void => scheduleHideFloat();

    const onOver = (e: PointerEvent): void => {
        const item = (e.target as HTMLElement).closest(opts.itemSelector);
        if (!item || !opts.delegateRoot.contains(item)) return;
        const card = opts.resolveCard(item as HTMLElement);
        if (!card) return;
        clearHideTimer();
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        applyPreviewNow(card);
    };

    const onMove = (e: PointerEvent): void => {
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        if (!root.hasAttribute('hidden')) scheduleReposition();
    };

    const onLeave = (e: PointerEvent): void => {
        const rel = e.relatedTarget as Node | null;
        if (rel && root.contains(rel)) return;
        scheduleHideFloat();
    };

    root.addEventListener(DOM_EVENT_POINTERENTER, onPreviewEnter);
    root.addEventListener(DOM_EVENT_POINTERLEAVE, onPreviewLeave);
    opts.delegateRoot.addEventListener(DOM_EVENT_POINTEROVER, onOver);
    opts.delegateRoot.addEventListener(DOM_EVENT_POINTERMOVE, onMove);
    opts.leaveRoot.addEventListener(DOM_EVENT_POINTERLEAVE, onLeave);

    return () => {
        root.removeEventListener(DOM_EVENT_POINTERENTER, onPreviewEnter);
        root.removeEventListener(DOM_EVENT_POINTERLEAVE, onPreviewLeave);
        opts.delegateRoot.removeEventListener(DOM_EVENT_POINTEROVER, onOver);
        opts.delegateRoot.removeEventListener(DOM_EVENT_POINTERMOVE, onMove);
        opts.leaveRoot.removeEventListener(DOM_EVENT_POINTERLEAVE, onLeave);
        clearHideTimer();
        resetSearchCardPreview(root, live, inner);
    };
}
