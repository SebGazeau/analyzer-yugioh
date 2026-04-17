import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { passcodeIsFidraulisGyAdminValidatedDom } from '../../insights/fidraulisGyAdminValidated.js';
import { passcodeIsFidraulisGyVerified } from '../../insights/fidraulisGyAllowlist.js';

describe('fidraulisGyAdminValidatedDom', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        delete document.body.dataset.fidraulisGyAdminValidated;
    });
    afterEach(() => {
        delete document.body.dataset.fidraulisGyAdminValidated;
    });

    it('JSON sur body : passcode reconnu admin', () => {
        document.body.dataset.fidraulisGyAdminValidated = JSON.stringify([42424242]);
        expect(passcodeIsFidraulisGyAdminValidatedDom(42424242)).toBe(true);
        expect(passcodeIsFidraulisGyAdminValidatedDom(1)).toBe(false);
    });

    it('passcodeIsFidraulisGyVerified inclut admin validé hors allowlist statique', () => {
        document.body.dataset.fidraulisGyAdminValidated = JSON.stringify([42424242]);
        expect(passcodeIsFidraulisGyVerified(42424242)).toBe(true);
    });
});
