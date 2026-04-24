// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bindAccountDeleteConfirm } from '../account/deleteConfirm.js';

describe('account delete confirm', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <form data-account-action="delete">
                <button type="submit">Supprimer</button>
            </form>
        `;
    });

    it('bloque la soumission si confirm retourne false', () => {
        const form = document.querySelector('form[data-account-action="delete"]') as HTMLFormElement;
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        const event = new Event('submit', { cancelable: true });

        bindAccountDeleteConfirm();
        form.dispatchEvent(event);

        expect(confirmSpy).toHaveBeenCalledOnce();
        expect(event.defaultPrevented).toBe(true);
        confirmSpy.mockRestore();
    });

    it('laisse la soumission si confirm retourne true', () => {
        const form = document.querySelector('form[data-account-action="delete"]') as HTMLFormElement;
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const event = new Event('submit', { cancelable: true });

        bindAccountDeleteConfirm();
        form.dispatchEvent(event);

        expect(confirmSpy).toHaveBeenCalledOnce();
        expect(event.defaultPrevented).toBe(false);
        confirmSpy.mockRestore();
    });
});
