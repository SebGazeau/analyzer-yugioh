import { describe, expect, it } from 'vitest';
import { compositionBreakdownLevelBucketKey } from '../analysis/compositionBreakdownCopy.js';

describe('compositionBreakdownCopy', () => {
    it('compositionBreakdownLevelBucketKey', () => {
        expect(compositionBreakdownLevelBucketKey(4)).toBe('Niveau 4');
        expect(compositionBreakdownLevelBucketKey(12)).toBe('Niveau 12');
    });
});
