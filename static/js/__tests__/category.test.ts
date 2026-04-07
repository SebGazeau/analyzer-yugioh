// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createCategorySelector, getCardsByCategory } from '../category.js';
import { categoryOptions } from '../categoryData.js';
import {
  CATEGORY_CONTAINER_CLASS,
  DROPDOWN_EMPTY_MESSAGE_CLASS,
  DROPDOWN_EMPTY_MESSAGE_TEXT,
  DROPDOWN_LIST_CLASS,
} from '../categoryDomSelectors.js';
import { DOM_EVENT_CLICK } from '../utils/domEventNames.js';

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

  it('dropdown sans options affiche le message avec classe (style via CSS)', () => {
    const el = createCategorySelector();
    el.setCategories?.([...categoryOptions]);
    el.dispatchEvent(new MouseEvent(DOM_EVENT_CLICK, { bubbles: true }));
    const list = el.querySelector(`.${DROPDOWN_LIST_CLASS}`);
    const empty = list?.querySelector(`.${DROPDOWN_EMPTY_MESSAGE_CLASS}`);
    expect(empty?.textContent).toBe(DROPDOWN_EMPTY_MESSAGE_TEXT);
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