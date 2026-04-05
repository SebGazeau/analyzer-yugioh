// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { DECK_TABLE_GRID_CLASS, DECK_TABLE_GRID_SELECTOR } from '../deck-builder/deckConstants.js';
import { getDeckGridRows, getLastGridRow } from '../utils.js';
import { escapeAttr } from '../utils/html.js';

describe('utils/html escapeAttr', () => {
  it('échappe & " \' < > pour attributs', () => {
    expect(escapeAttr('a & b')).toBe('a &amp; b');
    expect(escapeAttr('say "hi"')).toBe('say &quot;hi&quot;');
    expect(escapeAttr("<a href='x'>")).toBe('&lt;a href=&#39;x&#39;&gt;');
    expect(escapeAttr('<img>')).toBe('&lt;img&gt;');
  });
});

describe('utils.ts', () => {
  describe('getDeckGridRows', () => {
    beforeEach(() => {
      document.body.innerHTML =
        `<div class="${DECK_TABLE_GRID_CLASS}">` +
        '<div></div>'.repeat(7) + // header
        '<div></div>'.repeat(7) + // row 1
        '<div></div>'.repeat(7) + // row 2
        '</div>';
    });

    it('returns correct number of rows', () => {
      const rows = getDeckGridRows(DECK_TABLE_GRID_SELECTOR, 7);
      expect(rows.length).toBe(2);
      expect(rows[0].length).toBe(7);
      expect(rows[1].length).toBe(7);
    });

    it('returns [] when grid is missing', () => {
      document.body.innerHTML = '';
      expect(getDeckGridRows('#missing-grid', 7)).toEqual([]);
    });
  });

  describe('getLastGridRow', () => {
    it('returns null when grid is missing', () => {
      document.body.innerHTML = '';
      expect(getLastGridRow('#missing', 7)).toBeNull();
    });

    it('returns null when rowCount is 0 (only header)', () => {
      document.body.innerHTML = '<div id="g">' + '<div></div>'.repeat(7) + '</div>';
      expect(getLastGridRow('#g', 7)).toBeNull();
    });

    it('returns last row when grid has rows', () => {
      document.body.innerHTML =
        '<div id="grid">' +
        '<div></div>'.repeat(7) + // header
        '<div class="r1"></div>'.repeat(7) +
        '<div class="r2"></div>'.repeat(7) +
        '</div>';
      const last = getLastGridRow('#grid', 7);
      expect(last).toHaveLength(7);
      expect(last?.[0]?.classList.contains('r2')).toBe(true);
    });
  });
}); 