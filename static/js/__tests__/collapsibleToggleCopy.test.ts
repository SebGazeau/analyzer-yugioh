import { describe, expect, it } from 'vitest';
import {
    COLLAPSIBLE_ANALYSIS_TOGGLE_COLLAPSED,
    COLLAPSIBLE_ANALYSIS_TOGGLE_EXPANDED,
} from '../init/collapsibleToggleCopy.js';

describe('collapsibleToggleCopy', () => {
    it('glyphes stables (contrat UI)', () => {
        expect(COLLAPSIBLE_ANALYSIS_TOGGLE_COLLAPSED).toBe('▶');
        expect(COLLAPSIBLE_ANALYSIS_TOGGLE_EXPANDED).toBe('▼');
    });
});
