/**
 * Toasts non bloquants (remplacement des `alert` pour les retours utilisateur légers).
 */

import { ROLE_ATTR, ROLE_STATUS } from './htmlAttrs.js';

/** Conteneur fixe — utilisé par les tests pour repérer les toasts. */
export const TOAST_CONTAINER_ID = 'toast-container';

/** Élément d’un toast — `data-variant` pour style et assertions. */
export const TOAST_ITEM_CLASS = 'toast-item';

const TOAST_DEFAULT_DURATION_MS = 4500;

export type ToastVariant = 'info' | 'success' | 'error';

export type ShowToastOptions = {
    variant?: ToastVariant;
    durationMs?: number;
};

function ensureContainer(): HTMLElement {
    let el = document.getElementById(TOAST_CONTAINER_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = TOAST_CONTAINER_ID;
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
}

/**
 * Affiche un message court ; le texte est injecté en `textContent` (pas de HTML).
 */
export function showToast(message: string, options?: ShowToastOptions): void {
    if (typeof document === 'undefined') return;
    const variant = options?.variant ?? 'info';
    const durationMs = options?.durationMs ?? TOAST_DEFAULT_DURATION_MS;

    const container = ensureContainer();
    const item = document.createElement('div');
    item.className = TOAST_ITEM_CLASS;
    item.dataset.variant = variant;
    item.setAttribute(ROLE_ATTR, ROLE_STATUS);
    item.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
    item.textContent = message;
    container.appendChild(item);

    window.setTimeout(() => {
        item.remove();
        if (container.childElementCount === 0) {
            container.remove();
        }
    }, durationMs);
}
