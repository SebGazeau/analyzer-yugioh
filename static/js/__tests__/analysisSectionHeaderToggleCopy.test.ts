import { describe, it, expect } from 'vitest';
import { ANALYSIS_SECTION_HEADER_TOGGLE_TEXT } from '../analysis/analysisSectionHeaderToggleCopy.js';

describe('analysisSectionHeaderToggleCopy', () => {
    it('toggle section : triangle bas U+25BC', () => {
        expect(ANALYSIS_SECTION_HEADER_TOGGLE_TEXT).toBe('\u25BC');
        expect(ANALYSIS_SECTION_HEADER_TOGGLE_TEXT.codePointAt(0)).toBe(0x25bc);
    });
});
