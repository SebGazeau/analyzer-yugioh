import { describe, expect, it } from 'vitest';
import {
    BUILDER_SORT_INDICATOR_ASC,
    BUILDER_SORT_INDICATOR_DESC,
    BUILDER_SORT_TITLE_CATEGORIES_MAIN,
    BUILDER_SORT_TITLE_COMPOSITION,
} from '../init/builderSortTitlesCopy.js';

describe('builderSortTitlesCopy', () => {
    it('titres et indicateurs non vides', () => {
        expect(BUILDER_SORT_TITLE_COMPOSITION.length).toBeGreaterThan(0);
        expect(BUILDER_SORT_TITLE_CATEGORIES_MAIN.length).toBeGreaterThan(0);
        expect(BUILDER_SORT_INDICATOR_ASC).toBe(' ↑');
        expect(BUILDER_SORT_INDICATOR_DESC).toBe(' ↓');
    });
});
