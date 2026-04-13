// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { isLikelyFetchNetworkFailure } from '../init/builderDeckDraft.js';

describe('init/builderDeckDraft', () => {
    describe('isLikelyFetchNetworkFailure', () => {
        it('reconnaît TypeError Failed to fetch (Chrome)', () => {
            expect(isLikelyFetchNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
        });

        it('reconnaît Load failed (Safari)', () => {
            expect(isLikelyFetchNetworkFailure(new Error('Load failed'))).toBe(true);
        });

        it('refuse les erreurs HTTP / parsing', () => {
            expect(isLikelyFetchNetworkFailure(new Error('Unexpected token'))).toBe(false);
            expect(isLikelyFetchNetworkFailure('Failed to fetch')).toBe(false);
            expect(isLikelyFetchNetworkFailure(null)).toBe(false);
        });
    });
});
