// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  CATEGORY_GROUPS,
  categoryOptions,
  createCategorySelector,
  getCardsByCategory,
} from '../category.js';
import { CATEGORY_CONTAINER_CLASS } from '../categoryDomSelectors.js';

describe('category.ts — données pures', () => {
  it('CATEGORY_GROUPS a des clés et valeurs tableau de chaînes', () => {
    expect(Object.keys(CATEGORY_GROUPS).length).toBeGreaterThan(0);
    for (const [groupName, cats] of Object.entries(CATEGORY_GROUPS)) {
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

describe('category.ts — createCategorySelector (DOM)', () => {
  it('retourne un élément avec la classe category-container', () => {
    const el = createCategorySelector();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.classList.contains(CATEGORY_CONTAINER_CLASS)).toBe(true);
  });

  it('getCategories retourne un tableau vide au départ', () => {
    const el = createCategorySelector();
    expect(el.getCategories?.()).toEqual([]);
  });

  it('addCategory puis getCategories reflète la catégorie', () => {
    const el = createCategorySelector();
    el.addCategory?.('Hand Trap');
    expect(el.getCategories?.()).toContain('Hand Trap');
    el.addCategory?.('Starter');
    expect(el.getCategories?.()).toEqual(expect.arrayContaining(['Hand Trap', 'Starter']));
  });

  it('setCategories remplace les catégories', () => {
    const el = createCategorySelector();
    el.setCategories?.(['Wincon', 'Brick']);
    expect(el.getCategories?.()).toEqual(expect.arrayContaining(['Wincon', 'Brick']));
  });

  it('une carte peut avoir plusieurs catégories', () => {
    const el = createCategorySelector();
    el.setCategories?.(['Starter', 'Extender', 'Consistency']);
    const cats = el.getCategories?.() ?? [];
    expect(cats).toContain('Starter');
    expect(cats).toContain('Extender');
    expect(cats).toContain('Consistency');
  });

  it('removeCategory retire la catégorie (unassign)', () => {
    const el = createCategorySelector();
    el.setCategories?.(['Hand Trap', 'Starter']);
    el.removeCategory?.('Hand Trap');
    expect(el.getCategories?.()).toEqual(expect.arrayContaining(['Starter']));
    expect(el.getCategories?.()).not.toContain('Hand Trap');
  });
});

describe('category.ts — getCardsByCategory (pur)', () => {
  it('retourne le sous-ensemble des cartes ayant la catégorie', () => {
    const deck = [
      { name: 'A', categories: ['Hand Trap', 'Interruption'] },
      { name: 'B', categories: ['Starter'] },
      { name: 'C', categories: ['Hand Trap'] },
      { name: 'D', categories: [] },
    ];
    const handTraps = getCardsByCategory(deck, 'Hand Trap');
    expect(handTraps).toHaveLength(2);
    expect(handTraps.map((c) => c.name)).toEqual(expect.arrayContaining(['A', 'C']));
  });

  it('une carte multi-catégorie est comptée dans chaque catégorie', () => {
    const deck = [
      { name: 'Dual', categories: ['Starter', 'Extender'] },
      { name: 'Only Starter', categories: ['Starter'] },
    ];
    expect(getCardsByCategory(deck, 'Starter')).toHaveLength(2);
    expect(getCardsByCategory(deck, 'Extender')).toHaveLength(1);
    expect(getCardsByCategory(deck, 'Extender')[0].name).toBe('Dual');
  });

  it('catégorie absente retourne tableau vide', () => {
    const deck = [{ name: 'A', categories: ['Hand Trap'] }];
    expect(getCardsByCategory(deck, 'Wincon')).toHaveLength(0);
  });
}); 