// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_CONTAINER_ID, TOAST_ITEM_CLASS, showToast } from '../utils/toast.js';
import {
    consumeSessionResyncAfterUnauthorized,
    markSessionResyncAfterUnauthorized,
    SESSION_RESYNC_AFTER_UNAUTHORIZED_KEY,
} from '../utils/sessionResyncAfterUnauthorized.js';

describe('showToast', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('ajoute un toast puis retire le nœud après la durée', () => {
        showToast('Hello', { durationMs: 1000 });
        const item = document.querySelector(`.${TOAST_ITEM_CLASS}`);
        expect(item?.textContent).toBe('Hello');
        expect(document.getElementById(TOAST_CONTAINER_ID)).toBeTruthy();
        vi.advanceTimersByTime(1000);
        expect(document.querySelector(`.${TOAST_ITEM_CLASS}`)).toBeNull();
        expect(document.getElementById(TOAST_CONTAINER_ID)).toBeNull();
    });
});

describe('sessionResyncAfterUnauthorized', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('mark puis consume retourne true une seule fois', () => {
        markSessionResyncAfterUnauthorized();
        expect(sessionStorage.getItem(SESSION_RESYNC_AFTER_UNAUTHORIZED_KEY)).toBe('1');
        expect(consumeSessionResyncAfterUnauthorized()).toBe(true);
        expect(sessionStorage.getItem(SESSION_RESYNC_AFTER_UNAUTHORIZED_KEY)).toBeNull();
        expect(consumeSessionResyncAfterUnauthorized()).toBe(false);
    });
});
