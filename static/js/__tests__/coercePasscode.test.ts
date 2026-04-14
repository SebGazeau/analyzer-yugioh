import { describe, expect, it } from 'vitest';
import { coercePositivePasscode } from '../utils/coercePasscode.js';

describe('coercePositivePasscode', () => {
    it('accepte nombre et chaîne numérique', () => {
        expect(coercePositivePasscode(70088809)).toBe(70088809);
        expect(coercePositivePasscode('70088809')).toBe(70088809);
        expect(coercePositivePasscode('  42  ')).toBe(42);
    });
    it('rejette invalide', () => {
        expect(coercePositivePasscode(undefined)).toBeUndefined();
        expect(coercePositivePasscode('')).toBeUndefined();
        expect(coercePositivePasscode('abc')).toBeUndefined();
        expect(coercePositivePasscode(0)).toBeUndefined();
    });
});
