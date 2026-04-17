/**
 * Après un 401 alors que le SSR affichait encore l’utilisateur connecté, `deckApi` recharge la page.
 * Ce fanion permet d’afficher un toast explicatif une fois la nouvelle page chargée.
 */
export const SESSION_RESYNC_AFTER_UNAUTHORIZED_KEY = 'analyzer_yg_session_resync_v1';

export function markSessionResyncAfterUnauthorized(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(SESSION_RESYNC_AFTER_UNAUTHORIZED_KEY, '1');
    } catch {
        /* quota / navigation privée */
    }
}

/** @returns true si un toast session doit être affiché (et efface la clé). */
export function consumeSessionResyncAfterUnauthorized(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    try {
        if (sessionStorage.getItem(SESSION_RESYNC_AFTER_UNAUTHORIZED_KEY) !== '1') return false;
        sessionStorage.removeItem(SESSION_RESYNC_AFTER_UNAUTHORIZED_KEY);
        return true;
    } catch {
        return false;
    }
}
