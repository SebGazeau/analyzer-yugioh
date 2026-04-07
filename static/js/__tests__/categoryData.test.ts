import { describe, expect, it } from 'vitest';
import { CATEGORY_GROUPS as categoryGroupsFromBarrel, categoryOptions as categoryOptionsFromBarrel } from '../category.js';
import { CATEGORY_GROUPS, categoryOptions } from '../categoryData.js';

describe('categoryData', () => {
    it('réexport depuis category.js pointe sur les mêmes tableaux', () => {
        expect(categoryGroupsFromBarrel).toBe(CATEGORY_GROUPS);
        expect(categoryOptionsFromBarrel).toBe(categoryOptions);
    });

    it('CATEGORY_GROUPS a des clés et valeurs tableau de chaînes', () => {
        expect(Object.keys(CATEGORY_GROUPS).length).toBeGreaterThan(0);
        for (const [, cats] of Object.entries(CATEGORY_GROUPS)) {
            expect(Array.isArray(cats)).toBe(true);
            cats.forEach((c) => expect(typeof c).toBe('string'));
        }
    });

    it('toutes les catégories des groupes sont dans categoryOptions', () => {
        const allFromGroups = new Set(Object.values(CATEGORY_GROUPS).flat());
        for (const cat of allFromGroups) {
            expect(categoryOptions).toContain(cat);
        }
    });
});
