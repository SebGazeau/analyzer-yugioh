import { describe, it, expect } from 'vitest';
import { CATEGORY_CONTAINER_CLASS, CHIPS_CATEGORIES_CLASS } from '../categoryDomSelectors.js';

describe('categoryDomSelectors', () => {
    it('contrats classes racine widget catégories', () => {
        expect(CATEGORY_CONTAINER_CLASS).toBe('category-container');
        expect(CHIPS_CATEGORIES_CLASS).toBe('chips-categories');
    });
});
