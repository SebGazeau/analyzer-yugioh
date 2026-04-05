import { describe, it, expect } from 'vitest';
import { cssLengthPx } from '../utils/cssInlineLength.js';

describe('cssInlineLength', () => {
    it('cssLengthPx produit une valeur px lisible par le navigateur', () => {
        expect(cssLengthPx(0)).toBe('0px');
        expect(cssLengthPx(12.5)).toBe('12.5px');
        expect(cssLengthPx(-3)).toBe('-3px');
    });
});
