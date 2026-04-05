import { describe, it, expect } from 'vitest';
import { cssLengthPercent, cssLengthPx } from '../utils/cssInlineLength.js';

describe('cssInlineLength', () => {
    it('cssLengthPx produit une valeur px lisible par le navigateur', () => {
        expect(cssLengthPx(0)).toBe('0px');
        expect(cssLengthPx(12.5)).toBe('12.5px');
        expect(cssLengthPx(-3)).toBe('-3px');
    });

    it('cssLengthPercent produit une valeur % lisible par le navigateur', () => {
        expect(cssLengthPercent(0)).toBe('0%');
        expect(cssLengthPercent(33.333)).toBe('33.333%');
    });
});
